const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.min(
                    dp[i - 1][j - 1] + 1,
                    dp[i - 1][j] + 1,
                    dp[i][j - 1] + 1
                );
            }
        }
    }
    return dp[m][n];
}

function calculateSimilarity(str1, str2) {
    const maxLength = Math.max(str1.length, str2.length);
    const distance = levenshteinDistance(str1, str2);
    return (maxLength - distance) / maxLength;
}

function cleanText(text) {
    return text
        .toLowerCase()
        .replace(/[.,!?]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

async function findBestMatchWithWordCount(quote, segments, wordCount, threshold) {
    let bestMatch = null;
    let bestScore = 0;
    
    const quoteStart = cleanText(quote.content.split(' ').slice(0, wordCount).join(' '));
    
    for (const segment of segments) {
        const cleanSegment = cleanText(segment.content);
        let bestSegmentScore = 0;
        const words = cleanSegment.split(' ');
        
        for (let i = 0; i < words.length - (wordCount - 1); i++) {
            const segmentPortion = words.slice(i, i + wordCount).join(' ');
            const score = calculateSimilarity(quoteStart, segmentPortion);
            
            if (score > bestSegmentScore) {
                bestSegmentScore = score;
            }
        }
        
        if (bestSegmentScore > bestScore && bestSegmentScore > threshold) {
            bestScore = bestSegmentScore;
            bestMatch = {
                segment: segment,
                score: bestSegmentScore,
                wordCount: wordCount // Add this to track which tier matched
            };
        }
    }

    return bestMatch;
}

async function findBestMatch(quote, episodeId) {
    const segments = await prisma.segment.findMany({
        where: { episodeId }
    });

    // Define tiers with word counts and thresholds
    const tiers = [
        { wordCount: 6, threshold: 0.7 },
        { wordCount: 5, threshold: 0.65 },
        { wordCount: 4, threshold: 0.6 },
        { wordCount: 3, threshold: 0.55 }
    ];

    // Try each tier until we find a match
    for (const tier of tiers) {
        const match = await findBestMatchWithWordCount(quote, segments, tier.wordCount, tier.threshold);
        if (match) {
            return match;
        }
    }

    return null;
}

async function updateQuoteWithSegment(quoteId, segmentId, matchScore) {
    try {
        await prisma.quote.update({
            where: { id: quoteId },
            data: {
                segmentId: segmentId,
                matchScore: matchScore
            }
        });
        return true;
    } catch (error) {
        console.error(`Error updating quote ${quoteId}:`, error);
        return false;
    }
}

async function processQuotesInBatches(batchSize = 50) {
    try {
        // Get total quote count
        const totalQuotes = await prisma.quote.count();
        console.log(`Found ${totalQuotes} quotes to process`);
        
        let processedCount = 0;
        let matchesFound = 0;
        let tierCounts = { 6: 0, 5: 0, 4: 0, 3: 0 };
        let updatedCount = 0;
        
        // Process in batches to avoid memory issues
        for (let skip = 0; skip < totalQuotes; skip += batchSize) {
            const quotes = await prisma.quote.findMany({
                skip: skip,
                take: batchSize,
                where: {
                    // Optionally, only process quotes without a segment already assigned
                    segmentId: null
                }
            });
            
            console.log(`\nProcessing batch ${Math.floor(skip/batchSize) + 1} (${skip}-${Math.min(skip + batchSize, totalQuotes)})`);
            
            for (let i = 0; i < quotes.length; i++) {
                const quote = quotes[i];
                processedCount++;
                
                // Show progress
                if (processedCount % 10 === 0) {
                    console.log(`Progress: ${processedCount}/${totalQuotes} quotes (${((processedCount/totalQuotes) * 100).toFixed(1)}%)`);
                }
                
                const match = await findBestMatch(quote, quote.episodeId);
                
                if (match) {
                    matchesFound++;
                    tierCounts[match.wordCount]++;
                    
                    // Update the database
                    const updateSuccess = await updateQuoteWithSegment(quote.id, match.segment.id, match.score);
                    
                    if (updateSuccess) {
                        updatedCount++;
                        console.log(`Quote #${processedCount}: MATCH FOUND ✓ (${Math.round(match.score * 100)}%, ${match.wordCount} words)`);
                    } else {
                        console.log(`Quote #${processedCount}: MATCH FOUND ✓ but UPDATE FAILED ✗`);
                    }
                } else {
                    console.log(`Quote #${processedCount}: NO MATCH ✗`);
                }
            }
        }
        
        // Print summary
        console.log("\n=== SUMMARY ===");
        console.log(`Quotes processed: ${processedCount}`);
        console.log(`Matches found: ${matchesFound} (${((matchesFound/processedCount) * 100).toFixed(2)}%)`);
        console.log(`Database updates successful: ${updatedCount}`);
        console.log("\nMatches by word count:");
        Object.entries(tierCounts).forEach(([wordCount, count]) => {
            console.log(`${wordCount} words: ${count} matches (${((count/matchesFound) * 100).toFixed(1)}%)`);
        });
        
    } catch (error) {
        console.error("Error in batch processing:", error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the process with default batch size
processQuotesInBatches();