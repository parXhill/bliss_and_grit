// scripts/loadTranscripts.js

const { PrismaClient } = require('@prisma/client');
const { parseTranscriptFile } = require('../utils/transcriptParser');
const fs = require('fs/promises');
const path = require('path');
require('dotenv').config();

const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  const episodeMap = {
    1: { episodeNumber: 1, episodeName: "Meet Vanessa", fileName: "" },
    2: { episodeNumber: 2, episodeName: "Meet Brooke", fileName: "" },
    3: { episodeNumber: 3, episodeName: "Why the body?", fileName: "" },
    4: { episodeNumber: 4, episodeName: "Debating Manifestation and Acceptance", fileName: "" },
    5: { episodeNumber: 5, episodeName: "When Truth is a Pain in the Ass", fileName: "" },
    6: { episodeNumber: 6, episodeName: "What is Disembodiment About?", fileName: "" },
    7: { episodeNumber: 7, episodeName: "Why Meditate", fileName: "" },
    8: { episodeNumber: 8, episodeName: "Psychology vs. Spirituality", fileName: "" },
    9: { episodeNumber: 9, episodeName: "What's Self Love Got To Do With It?", fileName: "" },
    10: { episodeNumber: 10, episodeName: "Self-Love In Action", fileName: "" },
    11: { episodeNumber: 11, episodeName: "On Spiritual Sensitivity", fileName: "" },
    12: { episodeNumber: 12, episodeName: "Getting Comfortable With Uncomfortable", fileName: "" },
    13: { episodeNumber: 13, episodeName: "Relating to Fear", fileName: "" },
    14: { episodeNumber: 14, episodeName: "Unhooking From the Fear Crazy Train", fileName: "" },
    15: { episodeNumber: 15, episodeName: "How We Heal", fileName: "" },
    16: { episodeNumber: 16, episodeName: "Joy Phobia", fileName: "" },
    17: { episodeNumber: 17, episodeName: "What About Selfless Love?", fileName: "" },
    18: { episodeNumber: 18, episodeName: "Emotional Contagion", fileName: "FINAL_BaG_EPS18_Emotional_Contagion_transcript_with_speakers.txt" },
    19: { episodeNumber: 19, episodeName: "Karma", fileName: "" },
    20: { episodeNumber: 20, episodeName: "Big Me vs. Little Me", fileName: "FINAL_BaG_EPS20_Big_Me_Little_Me_transcript_with_speakers.txt" },
    21: { episodeNumber: 21, episodeName: "The Ego", fileName: "FINAL_BaG_EPS21_The_Ego_transcript_with_speakers.txt" },
    22: { episodeNumber: 22, episodeName: "Groundlessness", fileName: "" },
    23: { episodeNumber: 23, episodeName: "Attachments and Desire", fileName: "" },
    24: { episodeNumber: 24, episodeName: "Love and Relationships", fileName: "" },
    25: { episodeNumber: 25, episodeName: "Where to Begin", fileName: "FINAL_BG_EPS25_transcript_with_speakers.txt" },
    26: { episodeNumber: 26, episodeName: "The Gifts of Grief and Despair", fileName: "" },
    27: { episodeNumber: 27, episodeName: "Healing a Broken Heart", fileName: "" },
    28: { episodeNumber: 28, episodeName: "Chasing Happiness", fileName: "FINAL_BaG_EPS28_Chasing_Happiness_transcript_with_speakers.txt" },
    29: { episodeNumber: 29, episodeName: "How to Stop, Drop, and Feel", fileName: "" },
    30: { episodeNumber: 30, episodeName: "Seek Ease and Choose Pleasure", fileName: "FINAL_BG_EPS30_Seek_Ease_And_Choose_Pleasure_transcript_with_speakers.txt" },
    31: { episodeNumber: 31, episodeName: "Defining Boundaries", fileName: "FINAL_BG_EPS31_Boundaries_transcript_with_speakers.txt" },
    32: { episodeNumber: 32, episodeName: "Holding Space for Not Knowing", fileName: "" },
    33: { episodeNumber: 33, episodeName: "The Self-Referencing Bubble", fileName: "" },
    35: { episodeNumber: 35, episodeName: "Pain Bodies in Action", fileName: "" },
    36: { episodeNumber: 36, episodeName: "Acceptance, Enjoyment, Enthusiasm", fileName: "" },
    37: { episodeNumber: 37, episodeName: "Self-Compassion Along The Way", fileName: "" },
    38: { episodeNumber: 38, episodeName: "The Importance of Community", fileName: "FINAL_BG_EPS38_Community_transcript_with_speakers.txt" },
    39: { episodeNumber: 39, episodeName: "Self-Compassion Part 2", fileName: "" },
    40: { episodeNumber: 40, episodeName: "Identity Crisis", fileName: "" },
    41: { episodeNumber: 41, episodeName: "The Realization Process", fileName: "" },
    42: { episodeNumber: 42, episodeName: "The Dynamics of Energy", fileName: "" },
    43: { episodeNumber: 43, episodeName: "Life as an Empath", fileName: "FINAL_BG_EPS43_Life_As_An_Empath_transcript_with_speakers.txt" },
    44: { episodeNumber: 44, episodeName: "The Subtle Edges of Relationship", fileName: "" },
    45: { episodeNumber: 45, episodeName: "Purpose", fileName: "" },
    46: { episodeNumber: 46, episodeName: "Trust Your Life", fileName: "FINAL_BG_EPS46_Living_From_Truth_transcript_with_speakers.txt" },
    48: { episodeNumber: 48, episodeName: "Body as Object or Body as Self?", fileName: "" },
    49: { episodeNumber: 49, episodeName: "The Need for Approval", fileName: "FINAL_BG_EPS49_Need_For_Approval_transcript_with_speakers.txt" },
    50: { episodeNumber: 50, episodeName: "Actually Loving What Arises", fileName: "" },
    51: { episodeNumber: 51, episodeName: "The Awakening Nervous System", fileName: "" },
    52: { episodeNumber: 52, episodeName: "Attachment Issues and Spirituality", fileName: "" },
    53: { episodeNumber: 53, episodeName: "Awakening FOMO", fileName: "" },
    54: { episodeNumber: 54, episodeName: "The Spiritual Path is Not a Benzo", fileName: "" },
    55: { episodeNumber: 55, episodeName: "Hearing the Unseen Worlds", fileName: "" },
    56: { episodeNumber: 56, episodeName: "Mercy to the Humans: A Conversation With Jeannie Zandi", fileName: "" },
    57: { episodeNumber: 57, episodeName: "Groundlessness Again?", fileName: "" },
    58: { episodeNumber: 58, episodeName: "Over-Identifying with the Body", fileName: "" },
    59: { episodeNumber: 59, episodeName: "On Making Yourself a Problem", fileName: "FINAL_BG_EPS59_Problem_Self_transcript_with_speakers.txt" },
    60: { episodeNumber: 60, episodeName: "Are We Responsible for Others?", fileName: "FINAL_BG_EPS60_Are_We_Responsible_For_Others_transcript_with_speakers.txt" },
    61: { episodeNumber: 61, episodeName: "Should We Focus on Positivity?", fileName: "FINAL_BG_EPS61_Positivity_transcript_with_speakers.txt" },
    62: { episodeNumber: 62, episodeName: "Extraordinarily Ordinary", fileName: "FINAL_BG_EPS62_Extraordinarily_Ordinary_transcript_with_speakers.txt" },
    63: { episodeNumber: 63, episodeName: "Living From the Heart: A Conversation with John J. Prendergast", fileName: "" },
    64: { episodeNumber: 64, episodeName: "On Aliveness", fileName: "FINAL_BG_EPS64_On_Aliveness_transcript_with_speakers.txt" },
    65: { episodeNumber: 65, episodeName: "What if It's Not a Problem?", fileName: "FINAL_BG_EPS65_transcript_with_speakers.txt" },
    66: { episodeNumber: 66, episodeName: "Everything is Welcome Here: Reflections on a Weekend with Matt Kahn", fileName: "" },
    67: { episodeNumber: 67, episodeName: "Ancestry, Heart, and Instinct: A Conversation with John Lockley", fileName: "" },
    68: { episodeNumber: 68, episodeName: "Meditation and Song with John Lockley", fileName: "" },
    69: { episodeNumber: 69, episodeName: "Bringing Through Your Purpose: A Conversation with Lissa Boles", fileName: "" },
    70: { episodeNumber: 70, episodeName: "Forgiveness", fileName: "FINAL_BG_EPS70_Forgiveness_transcript_with_speakers.txt" },
    71: { episodeNumber: 71, episodeName: "True Belonging", fileName: "" },
    72: { episodeNumber: 72, episodeName: "Being with the Darkness", fileName: "" },
    73: { episodeNumber: 73, episodeName: "The Micro-shaming Epidemic", fileName: "FINAL_BG_EPS73_Micro_Shaming_transcript_with_speakers.txt" },
    74: { episodeNumber: 74, episodeName: "Psychological Agendas", fileName: "" },
    75: { episodeNumber: 75, episodeName: "Ending the Search: A Conversation with Dorothy Hunt", fileName: "" },
    76: { episodeNumber: 76, episodeName: "Spiritual Bypass", fileName: "FINAL_BG_EPS76_Spiritual_Bypassing_transcript_with_speakers.txt" },
    77: { episodeNumber: 77, episodeName: "Fully Awake and Fully Human; A Conversation with Amoda Maa", fileName: "" },
    78: { episodeNumber: 78, episodeName: "Overemphasizing Suffering", fileName: "" },
    79: { episodeNumber: 79, episodeName: "Sacred Vigilance", fileName: "FINAL_BG_EPS79_Sacred_Vigilance_transcript_with_speakers.txt" },
    80: { episodeNumber: 80, episodeName: "I Don't Know", fileName: "FINAL_BG_EPS80_I_Dont_Know_transcript_with_speakers.txt" },
    81: { episodeNumber: 81, episodeName: "Meeting Anger", fileName: "" },
    82: { episodeNumber: 82, episodeName: "The Art of Shifting: A Conversation with Loch Kelly", fileName: "" },
    83: { episodeNumber: 83, episodeName: "The Awakening Nervous System Part 2", fileName: "" },
    84: { episodeNumber: 84, episodeName: "Everything is Here to Help You: A Conversation with Matt Kahn", fileName: "" },
    85: { episodeNumber: 85, episodeName: "Exploring the Similarities Between Teachings", fileName: "" },
    87: { episodeNumber: 87, episodeName: "Turning Towards Our Triggers", fileName: "" },
    88: { episodeNumber: 88, episodeName: "The Power of Words", fileName: "FINAL_BG_EPS88_Power_of_Words_transcript_with_speakers.txt" },
    89: { episodeNumber: 89, episodeName: "Our Bliss + Grit Journey", fileName: "" },
    90: { episodeNumber: 90, episodeName: "Why Talk About Awakening?", fileName: "" },
    91: { episodeNumber: 91, episodeName: "The Implications of Basic Trust", fileName: "FINAL_BG_EPS91_Basic_Trust (6)_transcript_with_speakers.txt" },
    92: { episodeNumber: 92, episodeName: "Radical Gratitude: A Conversation with Will Pye", fileName: "" },
    93: { episodeNumber: 93, episodeName: "Gradual Awakening; A Conversation with Miles Neale", fileName: "" },
    94: { episodeNumber: 94, episodeName: "Working with What Feels Unworkable", fileName: "FINAL_BG_EPS94_Hell_Realms_transcript_with_speakers.txt" },
    95: { episodeNumber: 95, episodeName: "Embodying Yin: A Conversation with Jeannie Zandi", fileName: "" },
    96: { episodeNumber: 96, episodeName: "Allowing Heaven: A Conversation with David Thomas", fileName: "" },
    97: { episodeNumber: 97, episodeName: "What If It's All Conditioning?", fileName: "FINAL_BG_EPS97_All_Conditioning_transcript_with_speakers.txt" },
    98: { episodeNumber: 98, episodeName: "Being Presence: A Conversation with Neelam", fileName: "" },
    99: { episodeNumber: 99, episodeName: "Shifting Co-Dependency", fileName: "FINAL_BG_EPS99_transcript_with_speakers.txt" },
    100: { episodeNumber: 100, episodeName: "The Good News", fileName: "" },
    101: { episodeNumber: 101, episodeName: "Can We Create Through Language?", fileName: "FINAL_BG_EPS101_Language_transcript_with_speakers.txt" },
    102: { episodeNumber: 102, episodeName: "Healing the Limbic System", fileName: "" },
    103: { episodeNumber: 103, episodeName: "On Trauma and the Unbound Body; A Conversation with Judith Blackstone", fileName: "" },
    104: { episodeNumber: 104, episodeName: "Turn Towards or Turn Away?", fileName: "Ep_104__Turn_Towards_or_Turn_Away_transcript_with_speakers.txt" },
    105: { episodeNumber: 105, episodeName: "A New Vision for Relationship: A Conversation with Amoda Maa and Kavi Jezzie Hockaday", fileName: "" },
    106: { episodeNumber: 106, episodeName: "Co-Creation", fileName: "BG-106_Project_Podcast_Co-Creation_transcript_with_speakers.txt" },
    107: { episodeNumber: 107, episodeName: "The Nitty Gritty of Transformation", fileName: "" },
    108: { episodeNumber: 108, episodeName: "Vision Pulls You", fileName: "" },
    109: { episodeNumber: 109, episodeName: "The Subtle Impacts of Judgment", fileName: "" },
    110: { episodeNumber: 110, episodeName: "Surrendering the Burden", fileName: "" },
    111: { episodeNumber: 111, episodeName: "Knowing Is Not Enough", fileName: "" },
    112: { episodeNumber: 112, episodeName: "Everything is Here to Help You [Flashback Tuesday]", fileName: "" },
    113: { episodeNumber: 113, episodeName: "Taking the Vertical Path", fileName: "" },
    114: { episodeNumber: 114, episodeName: "Awakened Relating: A Conversation with Lynn Marie Lumiere", fileName: "" },
    115: { episodeNumber: 115, episodeName: "How to Heal With Self-Love", fileName: "" },
    116: { episodeNumber: 116, episodeName: "Finding Safety", fileName: "Ep_116__Finding_Safety_transcript_with_speakers.txt" },
    117: { episodeNumber: 117, episodeName: "Presence as a Love Language", fileName: "" },
    118: { episodeNumber: 118, episodeName: "Basic Trust [Flashback Tuesday]", fileName: "" },
    119: { episodeNumber: 119, episodeName: "Spiritual Teacher Misconduct", fileName: "" },
    120: { episodeNumber: 120, episodeName: "When the Rules Don't Apply", fileName: "" },
    121: { episodeNumber: 121, episodeName: "Fear of Being \"Too Much\"", fileName: "" },
    122: { episodeNumber: 122, episodeName: "Neurosculpting: A Conversation with Lisa Wimberger [Part 1]", fileName: "" },
    123: { episodeNumber: 123, episodeName: "Neurosculpting: A Conversation with Lisa Wimberger [Part 2]", fileName: "" },
    124: { episodeNumber: 124, episodeName: "The Gratitude Prescription: A Conversation with Will Pye [Part 1]", fileName: "" },
    125: { episodeNumber: 125, episodeName: "The Gratitude Prescription: A Conversation with Will Pye [Part 2]", fileName: "" },
    126: { episodeNumber: 126, episodeName: "The Fawn Response", fileName: "" },
    127: { episodeNumber: 127, episodeName: "Energy Medicine: A Conversation with Jill Blakeway", fileName: "" },
    128: { episodeNumber: 128, episodeName: "Our View of Healing and Transformation", fileName: "Ep_128__Our_View_of_Healing_and_Transformation_transcript_with_speakers.txt" },
    129: { episodeNumber: 129, episodeName: "The Art of Shifting: A Conversation with Loch Kelly [Flashback Tuesday]", fileName: "" },
    130: { episodeNumber: 130, episodeName: "Living From the Heart: A Conversation with John J. Prendergast [Flashback Tuesday]", fileName: "" },
    131: { episodeNumber: 131, episodeName: "Allowing Heaven: A Conversation with David Thomas [Flashback Tuesday]", fileName: "" },
    132: { episodeNumber: 132, episodeName: "What If It's All Conditioning? [Flashback Tuesday]", fileName: "" },
    133: { episodeNumber: 133, episodeName: "Being Presence: A Conversation with Neelam [Flashback Tuesday]", fileName: "" },
    134: { episodeNumber: 134, episodeName: "Embodying Yin: A Conversation with Jeannie Zandi [Flashback Tuesday]", fileName: "" },
    135: { episodeNumber: 135, episodeName: "Meet Vanessa [Throwback Tuesday]", fileName: "" },
    136: { episodeNumber: 136, episodeName: "Meet Brooke [Flashback Tuesday]", fileName: "" },
    137: { episodeNumber: 137, episodeName: "Suffering is Optional: A Conversation with Gail Brenner", fileName: "" },
    138: { episodeNumber: 138, episodeName: "Living From Truth", fileName: "" },
    139: { episodeNumber: 139, episodeName: "Untangling the Imaginary Audience", fileName: "" },
    140: { episodeNumber: 140, episodeName: "From Fawn to Fierce: A Conversation with Jane Clapp", fileName: "" },
    141: { episodeNumber: 141, episodeName: "Why Does Deep Emotion Feel Overwhelming?", fileName: "" },
    143: { episodeNumber: 143, episodeName: "Ideas About Awakening", fileName: "" },
    144: { episodeNumber: 144, episodeName: "Or Maybe You're Perceiving Something Accurately?", fileName: "" },
    145: { episodeNumber: 145, episodeName: "When Change Comes to Something You Love", fileName: "" },
    146: { episodeNumber: 146, episodeName: "The Deep Heart with John Prendergast", fileName: "" },
    147: { episodeNumber: 147, episodeName: "From Codependence to Interdependence", fileName: "" },
    148: { episodeNumber: 148, episodeName: "Healing the Lineage", fileName: "" },
    149: { episodeNumber: 149, episodeName: "What is Trauma?", fileName: "" },
    150: { episodeNumber: 150, episodeName: "Can We Bio-Hack Ourselves into Better States of Mind and Being?", fileName: "" },
    151: { episodeNumber: 151, episodeName: "Spiritual Maturity and Surrender: A Conversation with Matt Kahn", fileName: "" },
    152: { episodeNumber: 152, episodeName: "You're Not Doing Anything Wrong", fileName: "" },
    153: { episodeNumber: 153, episodeName: "A Fond Farewell and What's Next", fileName: "" }
  }

// Create a reverse lookup to find episode info by filename
const fileNameToEpisodeMap = Object.values(episodeMap).reduce((map, episode) => {
  map[episode.fileName] = episode;
  return map;
}, {});

async function loadTranscript(filePath) {
  const fileName = path.basename(filePath);
  console.log(`Processing transcript: ${fileName}`);
  
  // Find episode info from our map
  const episodeInfo = fileNameToEpisodeMap[fileName];
  
  if (!episodeInfo) {
    console.warn(`No episode info found for ${fileName}, skipping...`);
    return;
  }
  
  // Check if episode already exists by episode number
  const existingEpisode = await prisma.episode.findFirst({
    where: {
      episodeNumber: episodeInfo.episodeNumber
    }
  });
  
  if (existingEpisode) {
    console.log(`Episode ${episodeInfo.episodeNumber} already exists, skipping...`);
    return; // Skip this episode entirely
  }
  
  console.log(`Loading transcript: ${fileName}`);
  
  // 1. Create episode only if it doesn't exist
  const episode = await prisma.episode.create({
    data: {
      title: `Episode ${episodeInfo.episodeNumber}: ${episodeInfo.episodeName}`,
      fileName: fileName,
      episodeNumber: episodeInfo.episodeNumber,
    },
  });
  
  // Rest of your function remains the same...
  
  // 2. Parse the transcript file
  const { segments, turns } = await parseTranscriptFile(filePath, episode.id);
  
  // 3. Ensure speakers exist in database
  const speakerIds = [...new Set([...segments.map(s => s.speakerId), ...turns.map(t => t.speakerId)])];
  
  for (const speakerId of speakerIds) {
    await prisma.speaker.upsert({
      where: { id: speakerId },
      update: {},
      create: {
        id: speakerId,
        displayName: speakerId === 'SPEAKER_00' ? 'Vanessa Scotto' : 
                    speakerId === 'SPEAKER_01' ? 'Brooke Thomas' : speakerId
      },
    });
  }
  
  // 4. Create all turns first
  const createdTurns = await Promise.all(
    turns.map(turn => 
      prisma.turn.create({
        data: {
          startTime: turn.startTime,
          endTime: turn.endTime,
          content: turn.content,
          episodeId: episode.id,
          speakerId: turn.speakerId,
        }
      })
    )
  );
  
  // 5. Create all segments and associate with turns
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const turnIndex = turns.findIndex(t => t.segments.includes(segment));
    
    if (turnIndex >= 0) {
      // Check if segment already exists
      const existingSegment = await prisma.segment.findFirst({
        where: {
          episodeId: episode.id,
          startTime: segment.startTime,
          speakerId: segment.speakerId
        }
      });
      
      if (!existingSegment) {
        await prisma.segment.create({
          data: {
            startTime: segment.startTime,
            endTime: segments[i + 1]?.startTime || null,
            content: segment.content,
            episodeId: episode.id,
            speakerId: segment.speakerId,
            turnId: createdTurns[turnIndex].id,
          },
        });
      } else {
        console.log(`Skipping duplicate segment at ${segment.startTime}`);
      }
    }
  }
  
  console.log(`Loaded episode ${episodeInfo.episodeNumber}: ${episodeInfo.episodeName}`);
}

async function loadAllTranscripts() {
    const transcriptsDir = path.resolve(__dirname, '../data/transcripts');
    const files = await fs.readdir(transcriptsDir);
  
  for (const fileName of Object.values(episodeMap).map(e => e.fileName)) {
    const filePath = path.join(transcriptsDir, fileName);
    
    // Check if file exists
    try {
      await fs.access(filePath);
      await loadTranscript(filePath);
    } catch (error) {
      console.error(`File not found: ${filePath}`);
    }
  }
}

// Alternative approach: process all files in directory and match with map
async function loadAllTranscriptsFromDirectory() {
  const transcriptsDir = path.resolve(__dirname, '../data/transcripts');
  const files = await fs.readdir(transcriptsDir);
  
  for (const file of files) {
    if (file.endsWith('.txt') && fileNameToEpisodeMap[file]) {
      await loadTranscript(path.join(transcriptsDir, file));
    } else if (file.endsWith('.txt')) {
      console.warn(`Found transcript file with no mapping: ${file}`);
    }
  }
}

// Choose which loading method to use
// loadAllTranscripts(); // Will only process files in the map

// Run the script
loadAllTranscriptsFromDirectory()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });