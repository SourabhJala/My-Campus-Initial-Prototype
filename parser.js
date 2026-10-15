/**
 * MyCampus - Event Information Parser
 * Supports deterministic rule-based parsing and optional LLM integration.
 */

// Month name mapping
const MONTH_NAMES = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11
};

/**
 * Normalizes and parses dates from various formats:
 * - 15 Oct 2026 / 15 October 2026 / 15-Oct-2026
 * - Oct 15, 2026 / October 15 2026
 * - 2026-10-15 / 2026/10/15
 * - 15/10/2026 or 15-10-2026
 * - With optional time: 11:59 PM, 5:00 PM, 14:30, at 4:00 PM, 9:00 AM
 */
function parseDateString(str) {
  if (!str) return null;
  const cleanStr = str.trim();

  // Do not parse pure URLs or venue words
  if (/^https?:\/\//i.test(cleanStr)) return null;

  // Extract time if present
  let hours = 23;
  let minutes = 59;
  let seconds = 0;

  // Strict time matching: e.g. 11:59 PM, 5:00 PM, 09:00 AM, 14:30
  const timeMatch = cleanStr.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (timeMatch) {
    let h = parseInt(timeMatch[1], 10);
    const m = parseInt(timeMatch[2], 10);
    const ampm = timeMatch[4] ? timeMatch[4].toLowerCase() : null;
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      hours = h;
      minutes = m;
    }
  } else {
    // Pattern like "at 4 PM" or "at 4:00 PM"
    const simpleTime = cleanStr.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
    if (simpleTime) {
      let h = parseInt(simpleTime[1], 10);
      const m = simpleTime[2] ? parseInt(simpleTime[2], 10) : 0;
      const ampm = simpleTime[3].toLowerCase();
      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        hours = h;
        minutes = m;
      }
    }
  }

  // 1. Format: 15 Oct 2026, 15th October 2026, 15-Oct-2026
  const dmyMatch = cleanStr.match(/\b(\d{1,2})(?:st|nd|rd|th)?[\s\-_]+([A-Za-z]{3,9})[\s\-_]+(20\d{2})\b/i);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const monthKey = dmyMatch[2].toLowerCase();
    const month = MONTH_NAMES[monthKey];
    const year = parseInt(dmyMatch[3], 10);
    if (month !== undefined && day >= 1 && day <= 31) {
      const d = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }

  // 2. Format: Oct 15, 2026 or October 15 2026
  const mdyMatch = cleanStr.match(/\b([A-Za-z]{3,9})[\s\-_]+(\d{1,2})(?:st|nd|rd|th)?,?[\s\-_]+(20\d{2})\b/i);
  if (mdyMatch) {
    const monthKey = mdyMatch[1].toLowerCase();
    const month = MONTH_NAMES[monthKey];
    const day = parseInt(mdyMatch[2], 10);
    const year = parseInt(mdyMatch[3], 10);
    if (month !== undefined && day >= 1 && day <= 31) {
      const d = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }

  // 3. Format: YYYY-MM-DD or YYYY/MM/DD (e.g. 2026-10-15)
  const ymdMatch = cleanStr.match(/\b(20\d{2})[-\/](\d{1,2})[-\/](\d{1,2})\b/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const d = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }

  // 4. Format: DD/MM/YYYY or DD-MM-YYYY (e.g. 15/10/2026)
  const numDmyMatch = cleanStr.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})\b/);
  if (numDmyMatch) {
    const day = parseInt(numDmyMatch[1], 10);
    const month = parseInt(numDmyMatch[2], 10) - 1;
    const year = parseInt(numDmyMatch[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const d = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }

  return null;
}

/**
 * Validates and sanitizes a URL
 */
function sanitizeUrl(rawUrl) {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch (e) {
    // invalid url
  }
  return '';
}

/**
 * Deterministic rule-based fallback parser
 */
function parseEventDeterministic(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      title: 'Untitled Campus Event',
      description: '',
      venue: '',
      registrationUrl: '',
      deadlines: []
    };
  }

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // 1. Registration URL extraction
  let registrationUrl = '';
  const urlRegex = /(https?:\/\/[^\s<>"'()]+)/gi;
  const urls = [];
  let m;
  while ((m = urlRegex.exec(rawText)) !== null) {
    const clean = sanitizeUrl(m[1]);
    if (clean) urls.push(clean);
  }

  if (urls.length > 0) {
    const prioritized = urls.find(u => /reg|form|apply|ticket|join|unstop|devpost/i.test(u));
    registrationUrl = prioritized || urls[0];
  }

  // 2. Title extraction
  let title = '';
  for (const line of lines) {
    const prefixMatch = line.match(/^(?:event(?:\s+name)?|title|topic|hackathon|workshop|webinar):\s*(.+)$/i);
    if (prefixMatch && prefixMatch[1].trim()) {
      title = prefixMatch[1].trim().replace(/^[\*#\-_🔥🚀✨📢🏆🎉\s]+|[\*#\-_🔥🚀✨📢🏆🎉\s]+$/g, '').trim();
      break;
    }
  }

  if (!title && lines.length > 0) {
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i];
      if (line.match(/^https?:\/\//i)) continue;
      if (line.match(/^(venue|location|date|time|link|registration):/i)) continue;
      
      const cleaned = line.replace(/^[\*#\-_🔥🚀✨📢🏆🎉\s]+|[\*#\-_🔥🚀✨📢🏆🎉\s]+$/g, '').trim();
      if (cleaned.length >= 3 && cleaned.length <= 100) {
        title = cleaned;
        break;
      }
    }
  }

  if (!title) {
    title = lines[0] ? lines[0].substring(0, 80) : 'Campus Event';
  }

  // 3. Venue extraction
  let venue = '';
  const venuePrefixes = /^(?:venue|location|place|where|held\s+at|room|auditorium|hall|campus|lab):\s*(.+)$/i;
  for (const line of lines) {
    const vMatch = line.match(venuePrefixes);
    if (vMatch && vMatch[1].trim()) {
      venue = vMatch[1].trim().replace(/^[\*#\-_]+|[\*#\-_]+$/g, '').trim();
      break;
    }
  }
  if (!venue) {
    for (const line of lines) {
      if (/\b(?:auditorium|seminar hall|innovation hub|lecture hall|campus|online|virtual|google meet|zoom)\b/i.test(line)) {
        if (!line.match(/https?:\/\//i) && line.length < 120 && !line.match(/^(date|time|deadline):/i)) {
          venue = line.replace(/^venue:\s*/i, '').replace(/^location:\s*/i, '').trim();
          break;
        }
      }
    }
  }

  // 4. Deadlines & Date Extraction
  const deadlines = [];

  lines.forEach((line) => {
    // Ignore pure venue or URL lines when looking for deadlines
    if (/^(?:venue|location|where):\s*/i.test(line)) return;
    if (/^https?:\/\//i.test(line)) return;

    const isoDate = parseDateString(line);
    if (isoDate) {
      let label = 'Event Date';

      // Check for labelled line like "Abstract Submission: 18 Oct 2026, 11:59 PM"
      const labelMatch = line.match(/^[•\-\*]?\s*([^:\-—\d]+?)(?::|—|-)\s*(.+)$/);
      if (labelMatch) {
        const potentialLabel = labelMatch[1].trim().replace(/^[\*#\-_]+|[\*#\-_]+$/g, '').trim();
        if (potentialLabel.length > 2 && potentialLabel.length < 40 && !/^(venue|location|link|url)$/i.test(potentialLabel)) {
          label = potentialLabel;
        }
      } else {
        if (/abstract/i.test(line)) label = 'Abstract Submission';
        else if (/reg(?:ister|istration)|rsvp/i.test(line)) label = 'Registration Deadline';
        else if (/submission/i.test(line)) label = 'Final Submission';
        else if (/round\s*1/i.test(line)) label = 'Round 1 Deadline';
        else if (/round\s*2/i.test(line)) label = 'Round 2 Deadline';
        else if (/starts?/i.test(line)) label = 'Event Start';
        else if (/ends?/i.test(line)) label = 'Event End';
        else if (/shortlist/i.test(line)) label = 'Shortlist Announcement';
      }

      // Extract raw date snippet
      let rawSnippet = line.replace(/^[•\-\*]?\s*[^:\-—]+(?::|—|-)\s*/, '').trim();

      const isDuplicate = deadlines.some(d => d.date === isoDate && d.label.toLowerCase() === label.toLowerCase());
      if (!isDuplicate) {
        deadlines.push({
          label: label.charAt(0).toUpperCase() + label.slice(1),
          date: isoDate,
          rawDate: rawSnippet || line
        });
      }
    }
  });

  // If no deadline found with keywords, check whole text
  if (deadlines.length === 0) {
    const generalDate = parseDateString(rawText);
    if (generalDate) {
      deadlines.push({
        label: 'Event Date',
        date: generalDate,
        rawDate: 'Identified date'
      });
    }
  }

  // 5. Description
  const descCandidates = lines.filter(l => {
    if (l.includes(title) || title.includes(l)) return false;
    if (l.match(/^https?:\/\//i)) return false;
    if (l.match(/^(?:venue|location|registration\s+link|link):/i)) return false;
    if (deadlines.some(d => l.includes(d.rawDate))) return false;
    return true;
  });

  const description = descCandidates.slice(0, 3).join(' ').substring(0, 260).trim();

  return {
    title,
    description: description || 'No description provided.',
    venue: venue || 'Campus / TBD',
    registrationUrl,
    deadlines
  };
}

/**
 * Optional LLM-based parser if API key is provided
 */
async function parseEventWithLLM(rawText, apiKey, provider = 'gemini') {
  if (!apiKey) {
    return parseEventDeterministic(rawText);
  }

  const prompt = `You are a campus event information extractor. Extract structured event details from the raw text below into strictly valid JSON matching this schema:
{
  "title": "string (event name)",
  "description": "string (concise 1-2 sentence description)",
  "venue": "string (venue or online, 'TBD' if unknown)",
  "registrationUrl": "string (valid http/https URL if present, else empty string)",
  "deadlines": [
    {
      "label": "string (e.g. 'Abstract Submission', 'Registration Deadline', 'Hackathon Starts')",
      "date": "string (ISO 8601 date string e.g. 2026-10-15T23:59:00.000Z)",
      "rawDate": "string (original text snippet)"
    }
  ]
}

Raw Text:
${rawText}

Return ONLY raw JSON, with no markdown code fences, comments, or extra text.`;

  try {
    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }
      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (content) {
        const parsed = JSON.parse(content.replace(/```json|```/g, '').trim());
        parsed.registrationUrl = sanitizeUrl(parsed.registrationUrl);
        return parsed;
      }
    } else if (provider === 'openai') {
      const url = 'https://api.openai.com/v1/chat/completions';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        parsed.registrationUrl = sanitizeUrl(parsed.registrationUrl);
        return parsed;
      }
    }
  } catch (err) {
    console.warn('LLM parsing failed, falling back to deterministic parser:', err.message);
  }

  return parseEventDeterministic(rawText);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseDateString,
    sanitizeUrl,
    parseEventDeterministic,
    parseEventWithLLM
  };
}
