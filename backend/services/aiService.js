/**
 * AI Service - powered by a local Llama model via Ollama.
 *
 * Setup:
 *   1. Install Ollama: https://ollama.com
 *   2. Pull a model:    ollama pull llama3
 *   3. Make sure Ollama is running (it runs automatically as a service,
 *      or start it manually with: ollama serve)
 *
 * If Ollama is unreachable (e.g. not installed yet), this service
 * automatically falls back to a smarter rule-based resume analyzer.
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

const buildPrompt = (resumeText, jobTitle, jobDescription) => `
You are an expert technical recruiter and professional resume reviewer.

Analyze the RESUME below against the JOB DESCRIPTION and respond with ONLY a valid
JSON object (no markdown formatting, no code fences, no extra commentary) using
EXACTLY this structure:

{
  "matchScore": number (0-100, how well the resume matches the job),
  "atsScore": number (0-100, how well formatted/keyword-optimized the resume is for ATS systems),
  "foundSkills": string[] (skills from the job description that ARE present in the resume),
  "missingSkills": string[] (skills from the job description that are MISSING from the resume),
  "requiredSkills": string[] (skills the candidate should definitely include to better match this role),
  "niceToHaveSkills": string[] (skills that are not mandatory but would strengthen the application),
  "strengths": string[] (3-5 concise bullet points describing strong resume attributes or achievements),
  "weaknesses": string[] (3-5 concise bullet points identifying gaps, missing experience, or formatting issues),
  "recommendations": string[] (3-5 concrete, actionable suggestions to improve the resume based on the job description),
  "improvedSummary": string (a rewritten, 2-3 sentence professional summary tailored to this job and the resume),
  "atsFindings": string[] (specific ATS formatting and parsing findings),
  "sectionChecks": object[] (each item: { "label": string, "status": "pass"|"warning"|"fail", "detail": string })
}

Instructions:
- Use only facts that can be inferred from the resume text.
- Do not invent experience or skills that are not supported by the resume.
- Keep the summary specific, resume-based, and relevant to the job title.
- List required skills as the highest-priority abilities needed for this role.
- List nice-to-have skills as valuable additions that would make the candidate more competitive.

JOB TITLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription}

RESUME TEXT:
${resumeText}
`;

const extractJson = (text) => {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in AI response');
  return JSON.parse(match[0]);
};

const normalizeResult = (result) => ({
  matchScore: clampScore(result.matchScore),
  atsScore: clampScore(result.atsScore),
  foundSkills: toStringArray(result.foundSkills),
  missingSkills: toStringArray(result.missingSkills),
  requiredSkills: toStringArray(result.requiredSkills),
  niceToHaveSkills: toStringArray(result.niceToHaveSkills),
  strengths: toStringArray(result.strengths),
  weaknesses: toStringArray(result.weaknesses),
  recommendations: toStringArray(result.recommendations),
  improvedSummary: typeof result.improvedSummary === 'string' ? result.improvedSummary : '',
  atsFindings: toStringArray(result.atsFindings),
  sectionChecks: Array.isArray(result.sectionChecks) ? result.sectionChecks : [],
  keywordCoverage: result.keywordCoverage || {}
});

const clampScore = (value) => {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
};

const toStringArray = (value) => (Array.isArray(value) ? value.map(String) : []);

export const analyzeResumeWithAI = async (resumeText, jobTitle, jobDescription) => {
  if (process.env.OPENAI_API_KEY) {
    try {
      const { result, usage } = await callOpenAI(resumeText, jobTitle, jobDescription);
      return { result: enrichAnalysisResult(normalizeResult(result), resumeText, jobTitle, jobDescription), usage: { provider: 'openai', ...usage } };
    } catch (err) {
      console.warn('OpenAI failed, falling back to Ollama or fallback analyzer:', err.message);
    }
  }

  try {
    const result = await callOllama(resumeText, jobTitle, jobDescription);
    return { result: enrichAnalysisResult(normalizeResult(result), resumeText, jobTitle, jobDescription), usage: { provider: 'ollama', cost: 0 } };
  } catch (error) {
    console.warn('Ollama AI analysis unavailable, using fallback analyzer:', error.message);
    return { result: enrichAnalysisResult(fallbackAnalysis(resumeText, jobTitle, jobDescription), resumeText, jobTitle, jobDescription), usage: { provider: 'fallback', cost: 0 } };
  }
};

const callOllama = async (resumeText, jobTitle, jobDescription) => {
  const prompt = buildPrompt(resumeText, jobTitle, jobDescription);

  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      format: 'json'
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed with status ${response.status}`);
  }

  const data = await response.json();
  return extractJson(data.response);
};

const callOpenAI = async (resumeText, jobTitle, jobDescription) => {
  const prompt = buildPrompt(resumeText, jobTitle, jobDescription);
  const body = {
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI request failed: ${res.status} ${txt}`);
  }

  const data = await res.json();
  const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  const result = extractJson(content);
  const usage = data.usage || {};
  let cost = 0;
  if (usage.prompt_tokens || usage.completion_tokens) {
    const pt = usage.prompt_tokens || 0;
    const ct = usage.completion_tokens || 0;
    const ratePer1k = process.env.OPENAI_RATE_PER_1K || 0.03;
    cost = ((pt + ct) / 1000) * Number(ratePer1k);
  }

  return { result, usage: { promptTokens: usage.prompt_tokens || 0, completionTokens: usage.completion_tokens || 0, cost } };
};

const SKILL_ALIASES = {
  javascript: 'javascript',
  js: 'javascript',
  typescript: 'typescript',
  ts: 'typescript',
  python: 'python',
  java: 'java',
  'c#': 'c#',
  csharp: 'c#',
  'c++': 'c++',
  cpp: 'c++',
  go: 'go',
  golang: 'go',
  ruby: 'ruby',
  'ruby on rails': 'ruby on rails',
  rails: 'ruby on rails',
  php: 'php',
  scala: 'scala',
  kotlin: 'kotlin',
  swift: 'swift',
  bash: 'bash',
  shell: 'bash',
  sql: 'sql',
  'structured query language': 'sql',
  react: 'react',
  'react.js': 'react',
  reactjs: 'react',
  vue: 'vue',
  'vue.js': 'vue',
  angular: 'angular',
  'angular.js': 'angular',
  'next.js': 'next.js',
  nextjs: 'next.js',
  svelte: 'svelte',
  'node.js': 'node.js',
  nodejs: 'node.js',
  node: 'node.js',
  express: 'express',
  'express.js': 'express',
  nestjs: 'nestjs',
  'nest.js': 'nestjs',
  django: 'django',
  flask: 'flask',
  spring: 'spring',
  'spring boot': 'spring boot',
  mongodb: 'mongodb',
  postgres: 'postgresql',
  postgresql: 'postgresql',
  mysql: 'mysql',
  mariadb: 'mysql',
  sqlite: 'sqlite',
  redis: 'redis',
  cassandra: 'cassandra',
  dynamodb: 'dynamodb',
  bigquery: 'bigquery',
  snowflake: 'snowflake',
  redshift: 'redshift',
  aws: 'aws',
  'amazon web services': 'aws',
  azure: 'azure',
  'microsoft azure': 'azure',
  gcp: 'gcp',
  'google cloud': 'gcp',
  'google cloud platform': 'gcp',
  docker: 'docker',
  kubernetes: 'kubernetes',
  k8s: 'kubernetes',
  terraform: 'terraform',
  ansible: 'ansible',
  jenkins: 'jenkins',
  'github actions': 'github actions',
  'gitlab ci': 'gitlab ci',
  circleci: 'circleci',
  'ci/cd': 'ci/cd',
  cicd: 'ci/cd',
  git: 'git',
  rest: 'rest api',
  'rest api': 'rest api',
  'restful api': 'rest api',
  graphql: 'graphql',
  api: 'rest api',
  'microservices': 'microservices',
  serverless: 'serverless',
  'event-driven': 'event-driven',
  'unit testing': 'testing',
  testing: 'testing',
  jest: 'jest',
  mocha: 'mocha',
  cypress: 'cypress',
  selenium: 'selenium',
  playwright: 'playwright',
  pytest: 'pytest',
  pandas: 'pandas',
  numpy: 'numpy',
  'scikit-learn': 'scikit-learn',
  scikitlearn: 'scikit-learn',
  tensorflow: 'tensorflow',
  pytorch: 'pytorch',
  spark: 'spark',
  hadoop: 'hadoop',
  'machine learning': 'machine learning',
  ml: 'machine learning',
  ai: 'machine learning',
  agile: 'agile',
  scrum: 'scrum',
  kanban: 'kanban',
  'product management': 'product management',
  leadership: 'leadership',
  'stakeholder management': 'stakeholder management',
  'project management': 'project management',
  'communication skills': 'communication skills'
};

const KNOWN_SECTIONS = {
  summary: ['summary', 'professional summary', 'about me', 'profile', 'career summary', 'summary statement'],
  experience: ['experience', 'work experience', 'professional experience', 'employment history'],
  education: ['education', 'academic background', 'academic qualifications'],
  skills: ['skills', 'technical skills', 'tools', 'expertise'],
  certifications: ['certifications', 'licenses', 'certificates'],
  projects: ['projects', 'project experience', 'selected projects'],
  awards: ['awards', 'honors', 'recognition']
};

const escapeRegex = (text) => text.replace(/[.*+?^${}()\[\]\\|-]/g, '\\$&');

const normalizeSkill = (skill) => {
  if (!skill) return '';
  const cleaned = skill.toLowerCase().replace(/[\u2018\u2019\u201c\u201d'"()]/g, '').trim();
  if (!cleaned) return '';
  const normalized = cleaned.replace(/\s+/g, ' ').replace(/\.+/g, '.').trim();
  return SKILL_ALIASES[normalized] || normalized;
};

const extractKeywordsFromText = (text) => {
  const cleaned = text.toLowerCase().replace(/[\r\n]+/g, ' ');
  const results = new Set();
  Object.keys(SKILL_ALIASES).forEach((alias) => {
    const escaped = escapeRegex(alias);
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(cleaned)) {
      results.add(SKILL_ALIASES[alias]);
    }
  });
  return Array.from(results).sort();
};

const parseResumeSections = (resumeText) => {
  const sections = {};
  const lines = resumeText.split(/\r?\n/).map((line) => line.trim());
  let currentSection = 'header';

  const normalizedHeaders = Object.entries(KNOWN_SECTIONS).reduce((map, [key, labels]) => {
    labels.forEach((label) => { map[label] = key; });
    return map;
  }, {});

  lines.forEach((line) => {
    if (!line) return;
    const normalized = line.toLowerCase().replace(/[:\-]+$/, '').trim();
    if (normalizedHeaders[normalized]) {
      currentSection = normalizedHeaders[normalized];
      sections[currentSection] = sections[currentSection] || [];
      return;
    }

    sections[currentSection] = sections[currentSection] || [];
    sections[currentSection].push(line);
  });

  return sections;
};

const parseDelimitedSkillLine = (line) => {
  const tokens = line.split(/[|,;/•·\-]+/).map((token) => token.trim()).filter(Boolean);
  return tokens.map(normalizeSkill).filter(Boolean);
};

const extractSkillsFromResume = (resumeText) => {
  const sections = parseResumeSections(resumeText);
  const normalizedText = resumeText.toLowerCase();
  const skills = new Set();

  (sections.skills || []).forEach((line) => {
    parseDelimitedSkillLine(line).forEach((skill) => skills.add(skill));
  });

  Object.keys(SKILL_ALIASES).forEach((alias) => {
    const regex = new RegExp(`\\b${escapeRegex(alias)}\\b`, 'i');
    if (regex.test(normalizedText)) {
      skills.add(SKILL_ALIASES[alias]);
    }
  });

  return Array.from(skills).sort();
};

const splitSentences = (text) => text
  .replace(/[\r\n]+/g, ' ')
  .split(/(?<=[.!?])\s+/)
  .map((sentence) => sentence.trim())
  .filter(Boolean);

const extractSkillCandidatesFromJobDescription = (jobDescription) => {
  const candidates = new Set();
  const normalizedText = jobDescription.replace(/[\r\n]+/g, ' ');
  const triggerRegex = /(?:experience with|knowledge of|proficient in|expert in|familiarity with|using the following|including|preferably|preferred|must have|must|required to|required|nice to have|desirable|bonus|optional)\s+([^.\n]+)/gi;
  let match;

  while ((match = triggerRegex.exec(normalizedText)) !== null) {
    match[1].split(/[,;|/]|\band\b|\bor\b/).forEach((candidate) => {
      const normalized = normalizeSkill(candidate.trim());
      if (normalized) candidates.add(normalized);
    });
  }

  extractKeywordsFromText(jobDescription).forEach((skill) => candidates.add(skill));
  return Array.from(candidates).sort();
};

const parseJobDescriptionSkills = (jobDescription) => {
  const requiredTriggers = ['required', 'must have', 'must', 'required to', 'required skills', 'required experience', 'strong knowledge', 'experience with'];
  const niceTriggers = ['preferred', 'nice to have', 'desirable', 'bonus', 'would be a plus', 'nice if', 'preferably', 'useful'];
  const allCandidates = extractSkillCandidatesFromJobDescription(jobDescription);
  const required = new Set();
  const nice = new Set();

  splitSentences(jobDescription).forEach((sentence) => {
    const sentenceLower = sentence.toLowerCase();
    const sentenceSkills = extractSkillCandidatesFromJobDescription(sentence);

    sentenceSkills.forEach((skill) => {
      if (requiredTriggers.some((trigger) => sentenceLower.includes(trigger))) {
        required.add(skill);
      } else if (niceTriggers.some((trigger) => sentenceLower.includes(trigger))) {
        nice.add(skill);
      }
    });
  });

  allCandidates.forEach((skill) => {
    if (!required.has(skill) && !nice.has(skill)) {
      required.add(skill);
    }
  });

  if (required.size === 0 && allCandidates.length > 0) {
    allCandidates.slice(0, 5).forEach((skill) => required.add(skill));
  }

  return {
    requiredSkills: Array.from(required).sort(),
    niceToHave: Array.from(nice).sort()
  };
};

const analyzeResumeStructure = (resumeText) => {
  const sections = parseResumeSections(resumeText);
  const bulletCount = (resumeText.match(/^[\s\-\*•\u2022]+/gm) || []).length;
  const metricCount = (resumeText.match(/\b(?:\d+\.?\d*%|\$\d+|€\d+|£\d+|\d+\s+(?:years?|months?|weeks?|days?)|increase|decrease|reduce|improve|grow|deliver|launch|optimize)\b/gi) || []).length;
  const hasSkillsSection = Array.isArray(sections.skills) && sections.skills.length > 0;
  const hasExperienceSection = Array.isArray(sections.experience) && sections.experience.length > 0;
  const hasEducationSection = Array.isArray(sections.education) && sections.education.length > 0;
  const hasSummarySection = Array.isArray(sections.summary) && sections.summary.length > 0;
  const hasContactInfo = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(resumeText) || /\+?\d[\d\s().-]{7,}\d/.test(resumeText);
  const hasProblematicFormatting = /\b(?:table|text box|image|graphic|header\/footer)\b/i.test(resumeText);

  const structurePoints =
    (hasSkillsSection ? 7 : 0) +
    (hasExperienceSection ? 8 : 0) +
    (hasEducationSection ? 6 : 0) +
    (hasSummarySection ? 5 : 0) +
    Math.min(5, Math.floor(bulletCount / 4)) +
    Math.min(5, Math.floor(metricCount / 2));

  return {
    sections,
    hasSkillsSection,
    hasExperienceSection,
    hasEducationSection,
    hasSummarySection,
    hasContactInfo,
    hasProblematicFormatting,
    bulletCount,
    metricCount,
    qualityScore: Math.min(40, structurePoints) + 30
  };
};

const computeMatchScore = (foundCount, totalNeeded, resumeAnalysis) => {
  const requirementScore = totalNeeded ? foundCount / totalNeeded : 0.45;
  const structureWeight = resumeAnalysis.qualityScore / 100;
  return clampScore(Math.round((requirementScore * 0.7 + structureWeight * 0.3) * 100));
};

const computeAtsScore = (resumeAnalysis, matchScore) => {
  const sectionScore =
    (resumeAnalysis.hasContactInfo ? 10 : 0) +
    (resumeAnalysis.hasSummarySection ? 10 : 0) +
    (resumeAnalysis.hasSkillsSection ? 15 : 0) +
    (resumeAnalysis.hasExperienceSection ? 20 : 0) +
    (resumeAnalysis.hasEducationSection ? 10 : 0);
  const readabilityScore = Math.min(15, resumeAnalysis.bulletCount * 2) + Math.min(10, resumeAnalysis.metricCount * 2);
  const formattingPenalty = resumeAnalysis.hasProblematicFormatting ? 10 : 0;
  return clampScore(sectionScore + readabilityScore + Math.round(matchScore * 0.2) - formattingPenalty);
};

const buildSectionChecks = (resumeAnalysis, foundSkills, requiredSkills) => ([
  {
    label: 'Contact information',
    status: resumeAnalysis.hasContactInfo ? 'pass' : 'warning',
    detail: resumeAnalysis.hasContactInfo ? 'Email or phone contact information was detected.' : 'Add a clear email and phone number near the top of the resume.'
  },
  {
    label: 'Professional summary',
    status: resumeAnalysis.hasSummarySection ? 'pass' : 'warning',
    detail: resumeAnalysis.hasSummarySection ? 'A summary/profile section was detected.' : 'Add a short summary tailored to the target role.'
  },
  {
    label: 'Skills section',
    status: resumeAnalysis.hasSkillsSection ? 'pass' : 'fail',
    detail: resumeAnalysis.hasSkillsSection ? 'A dedicated skills section was detected.' : 'Add a dedicated skills section so ATS systems can parse keywords reliably.'
  },
  {
    label: 'Experience section',
    status: resumeAnalysis.hasExperienceSection ? 'pass' : 'fail',
    detail: resumeAnalysis.hasExperienceSection ? 'A work experience section was detected.' : 'Use a standard heading like Professional Experience or Work Experience.'
  },
  {
    label: 'Required keyword coverage',
    status: requiredSkills.length === 0 || foundSkills.length / requiredSkills.length >= 0.7 ? 'pass' : 'warning',
    detail: requiredSkills.length
      ? `${foundSkills.length} of ${requiredSkills.length} required job keywords were found in the resume text.`
      : 'No explicit required skills were extracted from the job description.'
  }
]);

const buildAtsFindings = (resumeAnalysis, foundSkills, missingSkills, requiredSkills) => {
  const findings = [
    `${foundSkills.length} matching job keywords found; ${missingSkills.length} target keywords missing.`,
    `${resumeAnalysis.bulletCount} bullet-style lines and ${resumeAnalysis.metricCount} measurable results detected.`
  ];

  if (!resumeAnalysis.hasSkillsSection) findings.push('ATS risk: missing dedicated skills section.');
  if (!resumeAnalysis.hasExperienceSection) findings.push('ATS risk: missing standard experience section heading.');
  if (!resumeAnalysis.hasContactInfo) findings.push('ATS warning: contact information was not clearly detected.');
  if (resumeAnalysis.hasProblematicFormatting) findings.push('Possible formatting risk detected; keep the resume mostly text-based with simple headings.');
  if (requiredSkills.length && foundSkills.length / requiredSkills.length < 0.5) findings.push('Keyword coverage is low for the required skills in this job description.');

  return findings;
};

const buildKeywordCoverage = (foundSkills, requiredSkills, niceToHaveSkills) => {
  const requiredFound = requiredSkills.filter((skill) => foundSkills.includes(skill)).length;
  const niceFound = niceToHaveSkills.filter((skill) => foundSkills.includes(skill)).length;
  const total = requiredSkills.length + niceToHaveSkills.length;
  const found = requiredFound + niceFound;

  return {
    requiredFound,
    requiredTotal: requiredSkills.length,
    niceFound,
    niceTotal: niceToHaveSkills.length,
    percentage: total ? clampScore((found / total) * 100) : 0
  };
};

const enrichAnalysisResult = (result, resumeText, jobTitle, jobDescription) => {
  const jobDef = parseJobDescriptionSkills(jobDescription);
  const requiredSkills = jobDef.requiredSkills;
  const niceToHaveSkills = jobDef.niceToHave.filter((skill) => !requiredSkills.includes(skill));
  const jobSkills = Array.from(new Set([...requiredSkills, ...niceToHaveSkills]));
  const resumeSkills = extractSkillsFromResume(resumeText);
  const foundSkills = jobSkills.filter((skill) => resumeSkills.includes(skill));
  const missingSkills = jobSkills.filter((skill) => !foundSkills.includes(skill));
  const resumeAnalysis = analyzeResumeStructure(resumeText);
  const matchScore = computeMatchScore(foundSkills.length, jobSkills.length || 1, resumeAnalysis);
  const atsScore = computeAtsScore(resumeAnalysis, matchScore);

  return {
    ...result,
    matchScore,
    atsScore,
    foundSkills,
    missingSkills,
    requiredSkills,
    niceToHaveSkills,
    strengths: result.strengths.length ? result.strengths : buildStrengths(foundSkills, resumeAnalysis),
    weaknesses: result.weaknesses.length ? result.weaknesses : buildWeaknesses(missingSkills, resumeAnalysis),
    recommendations: result.recommendations.length ? result.recommendations : buildRecommendations(missingSkills, resumeAnalysis),
    improvedSummary: result.improvedSummary || buildImprovedSummary(jobTitle, foundSkills, resumeAnalysis, missingSkills),
    atsFindings: buildAtsFindings(resumeAnalysis, foundSkills, missingSkills, requiredSkills),
    sectionChecks: buildSectionChecks(resumeAnalysis, foundSkills, requiredSkills),
    keywordCoverage: buildKeywordCoverage(foundSkills, requiredSkills, niceToHaveSkills)
  };
};

const buildStrengths = (foundSkills, resumeAnalysis) => {
  const strengths = [];
  if (foundSkills.length) {
    strengths.push(`Resume includes relevant skills such as ${foundSkills.slice(0, 4).join(', ')}.`);
  }
  if (resumeAnalysis.hasExperienceSection) {
    strengths.push('Work history is clearly presented in an experience section.');
  }
  if (resumeAnalysis.metricCount > 0) {
    strengths.push('Resume contains measurable achievement statements.');
  }
  if (resumeAnalysis.hasSkillsSection) {
    strengths.push('A dedicated skills section helps recruiters and ATS parse qualifications.');
  }
  if (strengths.length === 0) {
    strengths.push('The resume has a solid foundation and can benefit from clearer section structure and keyword alignment.');
  }
  return strengths.slice(0, 5);
};

const buildWeaknesses = (missingSkills, resumeAnalysis) => {
  const weaknesses = [];
  if (missingSkills.length) {
    weaknesses.push(`Does not clearly show experience in ${missingSkills.slice(0, 5).join(', ')}.`);
  }
  if (!resumeAnalysis.hasSkillsSection) {
    weaknesses.push('No dedicated skills section detected.');
  }
  if (!resumeAnalysis.hasExperienceSection) {
    weaknesses.push('Experience section is missing or not clearly labeled.');
  }
  if (resumeAnalysis.metricCount === 0) {
    weaknesses.push('Lacks quantified achievements to demonstrate impact.');
  }
  if (weaknesses.length === 0) {
    weaknesses.push('Resume is well-structured but can be strengthened with clearer alignment to job-specific skills.');
  }
  return weaknesses.slice(0, 5);
};

const buildRecommendations = (missingSkills, resumeAnalysis) => {
  const recommendations = [];
  if (missingSkills.length) {
    missingSkills.slice(0, 5).forEach((skill) => {
      recommendations.push(`Add a bullet or skills entry that highlights experience with ${skill}.`);
    });
  }
  if (!resumeAnalysis.hasSkillsSection) {
    recommendations.push('Add a dedicated technical skills section near the top of the resume.');
  }
  if (!resumeAnalysis.hasSummarySection) {
    recommendations.push('Include a concise professional summary that ties your background to the job title.');
  }
  if (resumeAnalysis.metricCount === 0) {
    recommendations.push('Add measurable results or performance metrics to achievement statements.');
  }
  if (recommendations.length === 0) {
    recommendations.push('Refine bullet points to emphasize outcomes and align them to the target role.');
  }
  return recommendations.slice(0, 5);
};

const buildImprovedSummary = (jobTitle, foundSkills, resumeAnalysis, missingSkills) => {
  const title = jobTitle ? jobTitle.replace(/\s+/g, ' ').trim() : 'professional';
  const skillSnippet = foundSkills.length > 0 ? `${foundSkills.slice(0, 3).join(', ')}` : 'relevant technical skills';
  const gapNote = missingSkills.length > 0 ? ` It should also mention experience with ${missingSkills.slice(0, 3).join(', ')} if applicable.` : '';

  return `Experienced ${title} with demonstrated strengths in ${skillSnippet}. ` +
    `The resume should emphasize measurable outcomes and clear alignment to the target role.${gapNote}`;
};

const fallbackAnalysis = (resumeText, jobTitle, jobDescription) => {
  const jobDef = parseJobDescriptionSkills(jobDescription);
  const jobSkills = Array.from(new Set([...jobDef.requiredSkills, ...jobDef.niceToHave]));
  const resumeSkills = extractSkillsFromResume(resumeText);

  const foundSkills = jobSkills.filter((skill) => resumeSkills.includes(skill));
  const missingSkills = jobSkills.filter((skill) => !foundSkills.includes(skill));

  const resumeAnalysis = analyzeResumeStructure(resumeText);
  const requiredSkills = jobDef.requiredSkills.length ? jobDef.requiredSkills : missingSkills.slice(0, 5);
  const niceToHaveSkills = jobDef.niceToHave.length
    ? jobDef.niceToHave.filter((skill) => !requiredSkills.includes(skill))
    : resumeSkills.filter((skill) => !requiredSkills.includes(skill)).slice(0, 5);

  const matchScore = computeMatchScore(foundSkills.length, jobSkills.length || 1, resumeAnalysis);
  const atsScore = computeAtsScore(resumeAnalysis, matchScore);

  return {
    matchScore,
    atsScore,
    foundSkills,
    missingSkills,
    requiredSkills,
    niceToHaveSkills,
    strengths: buildStrengths(foundSkills, resumeAnalysis),
    weaknesses: buildWeaknesses(missingSkills, resumeAnalysis),
    recommendations: buildRecommendations(missingSkills, resumeAnalysis),
    improvedSummary: buildImprovedSummary(jobTitle, foundSkills, resumeAnalysis, missingSkills)
  };
};

export const extractSkillsFromJobDescription = async (jobDescription) => {
  const prompt = `Extract REQUIRED and NICE_TO_HAVE skills from the JOB DESCRIPTION below. Respond with ONLY valid JSON in this shape: { "requiredSkills": ["skill1"], "niceToHave": ["skillA"] }\n\nWhen the description explicitly says 'required', 'must have', or 'must', place those skills under requiredSkills. When it says 'preferred', 'nice to have', 'desirable', 'bonus', or 'would be good', place those skills under niceToHave. Only include skills, technologies, certifications or competencies that are clearly mentioned in the job description.\n\nJOB DESCRIPTION:\n${jobDescription}`;

  if (process.env.OPENAI_API_KEY) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0 })
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`OpenAI jobdesc request failed: ${res.status} ${txt}`);
    }

    const data = await res.json();
    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    try {
      const parsed = JSON.parse(content.match(/\{[\s\S]*\}/)[0]);
      return parsed;
    } catch (err) {
      throw new Error('Failed to parse OpenAI response for job description');
    }
  }

  return parseJobDescriptionSkills(jobDescription);
};
