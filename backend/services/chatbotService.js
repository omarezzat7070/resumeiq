/**
 * Chatbot Service - AI-powered CV generation and editing
 * 
 * Features:
 * - CV creation from user input
 * - CV improvement and optimization
 * - ATS optimization
 * - Conversational AI interaction
 */

import { analyzeResumeWithAI, extractSkillsFromJobDescription } from './aiService.js';

const conversationState = new Map(); // Store conversation state per user

const buildChatbotPrompt = (userMessage, step, cvData) => `
You are an expert CV/Resume coach and AI assistant. Help the user create, improve, and optimize their CV.

Current step: ${step}
Current CV data: ${JSON.stringify(cvData || {})}

User message: "${userMessage}"

Based on the step and user input, respond helpfully and guide the user through the CV building process.
If collecting information, ask for specific details. If improving, provide concrete suggestions.
Keep responses concise and actionable.
`;

export const processChatMessage = async (userId, userMessage, step, cvData) => {
  try {
    // Get or create conversation state
    const conversationKey = `${userId}-${step}`;
    const state = conversationState.get(conversationKey) || {};

    let reply = '';
    let nextStep = step;
    let updatedCvData = cvData || {};
    let actions = null;

    // Handle different steps
    if (step === 'menu') {
      reply = "Please select an option from the menu.";
    } else if (step === 'create_intro') {
      // Collect name and title
      const [name, title] = userMessage.split(' - ').map(s => s.trim());
      updatedCvData.name = name || 'Your Name';
      updatedCvData.title = title || 'Professional';
      
      reply = `Nice to meet you, ${updatedCvData.name}! A ${updatedCvData.title} - that's great!\n\nNow, tell me about your professional experience. What are your previous roles, companies, and key accomplishments?`;
      nextStep = 'create_experience';
    } else if (step === 'create_experience') {
      updatedCvData.experience = userMessage;
      reply = `Excellent! Now, what's your educational background? (Degrees, institutions, graduation years)`;
      nextStep = 'create_education';
    } else if (step === 'create_education') {
      updatedCvData.education = userMessage;
      reply = `Great! What are your key technical skills and competencies? (Please list them separated by commas)`;
      nextStep = 'create_skills';
    } else if (step === 'create_skills') {
      updatedCvData.skills = userMessage.split(',').map(s => s.trim());
      reply = `Perfect! Any certifications, awards, or additional qualifications I should include?`;
      nextStep = 'create_certifications';
    } else if (step === 'create_certifications') {
      updatedCvData.certifications = userMessage;
      reply = `Your CV is ready! I'll now generate a professional resume optimized for ATS systems and job matching.\n\nWould you like me to:\n1. Generate your CV as a PDF\n2. Make any adjustments first`;
      nextStep = 'create_review';
      actions = [
        { label: 'Generate PDF', action: 'generate' },
        { label: 'Make Adjustments', action: 'adjust' }
      ];
    } else if (step === 'improve_intro') {
      reply = `I'll help improve your CV! What specific aspects would you like to focus on?\n- Better skill alignment with job descriptions\n- Improved formatting and structure\n- More impactful achievements\n- Better ATS optimization`;
      nextStep = 'improve_focus';
    } else if (step === 'improve_focus') {
      updatedCvData.improvementFocus = userMessage;
      reply = `Now, do you have a specific job description you want to match against? If you paste it, I can make your CV highly tailored to that role.`;
      nextStep = 'improve_jobdesc';
    } else if (step === 'improve_jobdesc') {
      updatedCvData.targetJobDescription = userMessage;
      reply = `Perfect! I'll analyze the job description and optimize your CV accordingly. Ready to generate your improved CV?`;
      nextStep = 'improve_ready';
      actions = [
        { label: 'Generate Improved CV', action: 'generate' },
        { label: 'Add More Details', action: 'add_details' }
      ];
    } else if (step === 'optimize_intro') {
      updatedCvData.targetJobDescription = userMessage;
      reply = `Great! I've noted the job description. Now, paste or describe your current CV content so I can optimize it to match this role and improve your ATS score.`;
      nextStep = 'optimize_cv_content';
    } else if (step === 'optimize_cv_content') {
      updatedCvData.currentCvContent = userMessage;
      reply = `Perfect! I'll now analyze your CV against the job description and create an ATS-optimized version with improved match score.`;
      nextStep = 'optimize_ready';
      actions = [
        { label: 'Generate Optimized CV', action: 'generate' }
      ];
    }

    // Save conversation state
    conversationState.set(conversationKey, state);

    return {
      reply,
      nextStep,
      updatedCvData,
      actions
    };
  } catch (error) {
    console.error('Chat processing error:', error);
    throw error;
  }
};

export const generateCVFromData = async (cvData) => {
  try {
    const sourceExperience = cvData.experience || cvData.currentCvContent || cvData.improvementFocus || '';
    const parsedCv = cvData.currentCvContent ? parseResumeContent(cvData.currentCvContent) : {};

    // Build a structured CV based on collected data
    const cv = {
      header: {
        name: cvData.name || parsedCv.header?.name || '',
        title: cvData.title || parsedCv.header?.title || '',
        contact: cvData.contact || {}
      },
      contactLine: parsedCv.contactLine || '',
      summary: cvData.summary || parsedCv.summary || buildProfessionalSummary(cvData),
      experience: parsedCv.experience || parseExperience(sourceExperience),
      education: cvData.education || parsedCv.education || '',
      skills: cvData.skills?.length ? cvData.skills : parsedCv.skills || [],
      certifications: cvData.certifications || parsedCv.certifications || '',
      additionalSections: parsedCv.additionalSections || []
    };

    // If there's a target job description, optimize the CV
    if (cvData.targetJobDescription) {
      return await optimizeCVForJob(cv, cvData.targetJobDescription);
    }

    return cv;
  } catch (error) {
    console.error('CV generation error:', error);
    throw error;
  }
};

const buildProfessionalSummary = (cvData) => {
  if (!cvData.title && !cvData.skills?.length) return '';

  const title = cvData.title || 'candidate';
  const skills = cvData.skills ? cvData.skills.slice(0, 3).join(', ') : 'key skills';
  return `Experienced ${title} with demonstrated expertise in ${skills}. Committed to delivering high-quality results and driving measurable impact.`;
};

const parseExperience = (experienceText) => {
  if (!experienceText) return [];
  // Simple parsing - in production, would be more sophisticated
  return experienceText.split(/\n|;/).map(exp => ({
    description: exp.trim()
  })).filter(e => e.description);
};

const normalizeResumeLines = (text) => String(text || '')
  .replace(/\r/g, '')
  .split('\n')
  .map(line => line.replace(/^[-•]\s*/, '').trim())
  .filter(Boolean);

const sectionAliases = {
  summary: ['PROFESSIONAL SUMMARY', 'SUMMARY', 'PROFILE'],
  skills: ['TECHNICAL SKILLS', 'SKILLS', 'CORE SKILLS'],
  experience: ['EXPERIENCE', 'PROFESSIONAL EXPERIENCE', 'WORK EXPERIENCE', 'EMPLOYMENT HISTORY'],
  education: ['EDUCATION', 'ACADEMIC BACKGROUND'],
  certifications: ['COURSES & CERTIFICATIONS', 'CERTIFICATIONS', 'COURSES'],
  languages: ['LANGUAGES'],
  competencies: ['CORE COMPETENCIES', 'COMPETENCIES']
};

const findSectionKey = (line) => {
  const upperLine = line.toUpperCase();
  return Object.entries(sectionAliases).find(([, aliases]) => aliases.includes(upperLine))?.[0] || null;
};

const parseResumeContent = (text) => {
  const lines = normalizeResumeLines(text);
  const firstSectionIndex = lines.findIndex(line => findSectionKey(line));
  const headerLines = (firstSectionIndex === -1 ? lines.slice(0, 3) : lines.slice(0, firstSectionIndex))
    .filter(line => !/^(professional|applicant)$/i.test(line));
  const sections = {};
  let currentSection = null;

  lines.slice(Math.max(firstSectionIndex, 0)).forEach((line) => {
    const sectionKey = findSectionKey(line);
    if (sectionKey) {
      currentSection = sectionKey;
      sections[currentSection] = sections[currentSection] || [];
      return;
    }

    if (currentSection) {
      sections[currentSection].push(line);
    }
  });

  const skills = sections.skills?.filter(line => !/^(backend|frontend|tools|design|languages)$/i.test(line)) || [];
  const additionalSections = [];

  if (sections.languages?.length) {
    additionalSections.push({ title: 'Languages', lines: sections.languages });
  }

  if (sections.competencies?.length) {
    additionalSections.push({ title: 'Core Competencies', lines: sections.competencies });
  }

  return {
    header: {
      name: headerLines[0] || '',
      title: headerLines[1] || ''
    },
    contactLine: headerLines.slice(2).join(' | '),
    summary: sections.summary?.join(' ') || '',
    skills,
    experience: sections.experience?.map(description => ({ description })) || null,
    education: sections.education?.join('\n') || '',
    certifications: sections.certifications?.join('\n') || '',
    additionalSections
  };
};

export const optimizeCVForJob = async (cv, jobDescription) => {
  try {
    // Extract job requirements
    const jobSkills = await extractSkillsFromJobDescription(jobDescription);
    
    // Keep the generated CV truthful: only surface job keywords already supported by the CV.
    const optimizedCv = { ...cv };
    const existingText = JSON.stringify(cv).toLowerCase();
    const supportedRequiredSkills = (jobSkills.requiredSkills || []).filter((skill) => {
      const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`, 'i').test(existingText);
    });

    optimizedCv.skills = [...new Set([...(optimizedCv.skills || []), ...supportedRequiredSkills])];

    return optimizedCv;
  } catch (error) {
    console.error('CV optimization error:', error);
    throw error;
  }
};

export const buildCVHTML = (cvData) => {
  const cv = typeof cvData === 'string' ? JSON.parse(cvData) : cvData;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Calibri, Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1 { margin: 0; color: #1a4d8f; font-size: 24px; }
        h2 { color: #1a4d8f; border-bottom: 2px solid #1a4d8f; margin-top: 20px; font-size: 14px; text-transform: uppercase; }
        .header { text-align: center; margin-bottom: 20px; }
        .section { margin-bottom: 15px; }
        .entry { margin-bottom: 10px; }
        .title { font-weight: bold; }
        .subtitle { font-style: italic; color: #555; }
        ul { margin: 5px 0; padding-left: 20px; }
        li { margin: 3px 0; }
        .skills { display: flex; flex-wrap: wrap; gap: 5px; }
        .skill { background: #e8f0f7; padding: 3px 8px; border-radius: 3px; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${cv.header.name}</h1>
        <p style="margin: 5px 0; color: #555;">${cv.header.title}</p>
        ${cv.contactLine ? `<p style="margin: 5px 0; color: #555;">${cv.contactLine}</p>` : ''}
      </div>

      ${cv.summary ? `
        <div class="section">
          <h2>Professional Summary</h2>
          <p>${cv.summary}</p>
        </div>
      ` : ''}

      ${cv.experience && cv.experience.length > 0 ? `
        <div class="section">
          <h2>Professional Experience</h2>
          ${cv.experience.map(exp => `
            <div class="entry">
              <p>${exp.description}</p>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${cv.education ? `
        <div class="section">
          <h2>Education</h2>
          <p>${cv.education}</p>
        </div>
      ` : ''}

      ${cv.skills && cv.skills.length > 0 ? `
        <div class="section">
          <h2>Skills</h2>
          <div class="skills">
            ${cv.skills.map(skill => `<span class="skill">${skill}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      ${cv.certifications ? `
        <div class="section">
          <h2>Certifications</h2>
          <p>${cv.certifications}</p>
        </div>
      ` : ''}

      ${cv.additionalSections?.map(section => `
        <div class="section">
          <h2>${section.title}</h2>
          <p>${section.lines.join('<br>')}</p>
        </div>
      `).join('') || ''}

    </body>
    </html>
  `;
};

const sanitizePdfText = (value) => String(value || '')
  .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const escapePdfText = (value) => sanitizePdfText(value)
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)');

const wrapText = (text, maxChars = 92) => {
  const words = sanitizePdfText(text).split(' ').filter(Boolean);
  const lines = [];
  let line = '';

  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });

  if (line) lines.push(line);
  return lines.length ? lines : [''];
};

export const buildCVPDF = (cvData) => {
  const cv = typeof cvData === 'string' ? JSON.parse(cvData) : cvData;
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 50;
  const bottomMargin = 50;
  const lineHeight = 14;
  const pages = [];
  let commands = [];
  let y = pageHeight - margin;

  const ensureSpace = (height = lineHeight) => {
    if (y - height < bottomMargin) {
      pages.push(commands.join('\n'));
      commands = [];
      y = pageHeight - margin;
    }
  };

  const writeLine = (text, { size = 10, bold = false, gap = 0, x = margin } = {}) => {
    ensureSpace(lineHeight + gap);
    const font = bold ? 'F2' : 'F1';
    commands.push(`BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`);
    y -= lineHeight + gap;
  };

  const writeWrapped = (text, options = {}) => {
    wrapText(text, options.maxChars).forEach((line) => writeLine(line, options));
  };

  const section = (title) => {
    y -= 6;
    writeLine(title.toUpperCase(), { size: 12, bold: true, gap: 2 });
    commands.push(`${margin} ${y + 9} m ${pageWidth - margin} ${y + 9} l S`);
  };

  if (cv.header?.name) {
    writeLine(cv.header.name, { size: 20, bold: true, gap: 4 });
  }

  if (cv.header?.title) {
    writeLine(cv.header.title, { size: 12, gap: 8 });
  }

  if (cv.contactLine) {
    writeWrapped(cv.contactLine, { size: 9, maxChars: 96, gap: 4 });
  }

  if (cv.summary) {
    section('Professional Summary');
    writeWrapped(cv.summary, { maxChars: 88 });
  }

  if (cv.experience?.length) {
    section('Professional Experience');
    cv.experience.forEach((exp) => {
      writeWrapped(exp.description, { maxChars: 88 });
      y -= 2;
    });
  }

  if (cv.education) {
    section('Education');
    writeWrapped(cv.education, { maxChars: 88 });
  }

  if (cv.skills?.length) {
    section('Skills');
    writeWrapped(cv.skills.join(', '), { maxChars: 88 });
  }

  if (cv.certifications) {
    section('Certifications');
    writeWrapped(cv.certifications, { maxChars: 88 });
  }

  cv.additionalSections?.forEach((extraSection) => {
    if (!extraSection.lines?.length) return;
    section(extraSection.title);
    extraSection.lines.forEach((line) => writeWrapped(line, { maxChars: 88 }));
  });

  pages.push(commands.join('\n'));

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`
  ];

  pages.forEach((content, index) => {
    const pageObjectNumber = 3 + index * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents ${contentObjectNumber} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(content, 'ascii')} >>\nstream\n${content}\nendstream`);
  });

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'ascii'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'ascii');
};
