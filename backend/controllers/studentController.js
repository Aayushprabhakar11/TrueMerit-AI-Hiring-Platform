const User = require('../models/User');
const Project = require('../models/Project');
const { fetchGithubData } = require('../services/githubService');
const { calculateTrueMeritScore, evaluateProjectExpert } = require('../services/aiService');
const { invalidateCacheByPrefix } = require('../services/cacheService');
const pdfParseLib = require('pdf-parse');

const parsePdfText = async (buffer) => {
  const dataBuffer = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  if (typeof pdfParseLib === 'function') {
    const data = await pdfParseLib(dataBuffer);
    return data.text || data;
  }

  const pdf = new pdfParseLib.PDFParse(dataBuffer);
  return await pdf.getText();
};

// @desc    Update student profile & sync github
// @route   PUT /api/students/profile
// @access  Private (Student)
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user && user.role === 'student') {
      user.name = req.body.name || user.name;
      user.college = req.body.college || user.college;
      user.cgpa = req.body.cgpa || user.cgpa;
      user.skills = req.body.skills || user.skills;
      user.resumeText = req.body.resumeText || user.resumeText;
      if (req.body.certifications) {
         user.certifications = req.body.certifications;
      }
      
      if (req.body.githubUsername && req.body.githubUsername !== user.githubUsername) {
        user.githubUsername = req.body.githubUsername;
        // Fetch new github data
        const ghData = await fetchGithubData(req.body.githubUsername);
        if(ghData) {
           user.githubData = ghData;
        }
      }

      // Recalculate score after profile update using Data Scientist Agent
      const projects = await Project.find({ student: user._id });
      
      const metrics = {
        githubData: user.githubData,
        projectScores: projects.map(p => p.aiComplexityScore),
        cgpa: user.cgpa,
        certifications: user.certifications
      };
      
      const aiScoreResult = await calculateTrueMeritScore(metrics);
      if (aiScoreResult) {
         user.trueMeritScore = {
            total: aiScoreResult.final_score || 0,
            githubScore: aiScoreResult.breakdown?.github || 0,
            projectScore: aiScoreResult.breakdown?.projects || 0,
            academicScore: aiScoreResult.breakdown?.academics || 0,
            certScore: aiScoreResult.breakdown?.certifications || 0,
            insight: aiScoreResult.insight || 'Updated via Profile metrics.'
         };
      }

      const updatedUser = await user.save();
      
      // Invalidate recruiter searches
      invalidateCacheByPrefix('students:');
      
      res.json(updatedUser);
    } else {
      res.status(404).json({ message: 'Student not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add a project
// @route   POST /api/students/projects
// @access  Private (Student)
const addProject = async (req, res) => {
  try {
    const { title, description, githubLink, liveLink, techStack } = req.body;

    // Real AI evaluation using Gemini (Expert Software Engineer Agent)
    const projectData = {
       title, description, techStack,
       readme: 'No extended README scraped', stars: 0, forks: 0, commits: 10
    };
    const aiEval = await evaluateProjectExpert(projectData);

    const project = new Project({
      student: req.user._id,
      title,
      description,
      githubLink,
      liveLink,
      techStack,
      aiComplexityScore: aiEval.complexity_score || 5,
      aiFeedback: aiEval.summary || 'Expert analysis complete.'
    });

    const createdProject = await project.save();

    // Recalculate User Score globally utilizing Agent 3
    const user = await User.findById(req.user._id);
    const projects = await Project.find({ student: user._id });
    
    const metrics = {
       githubData: user.githubData,
       projectScores: projects.map(p => p.aiComplexityScore),
       cgpa: user.cgpa,
       certifications: user.certifications
    };
    const aiScoreResult = await calculateTrueMeritScore(metrics);
    if (aiScoreResult) {
       user.trueMeritScore = {
          total: aiScoreResult.final_score || 0,
          githubScore: aiScoreResult.breakdown?.github || 0,
          projectScore: aiScoreResult.breakdown?.projects || 0,
          academicScore: aiScoreResult.breakdown?.academics || 0,
          certScore: aiScoreResult.breakdown?.certifications || 0,
          insight: aiScoreResult.insight || 'Recomputed following new project.'
       };
    }
    await user.save();

    // Invalidate recruiter searches
    invalidateCacheByPrefix('students:');

    res.status(201).json(createdProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get student projects
// @route   GET /api/students/projects
// @access  Private (Student)
const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({ student: req.user._id });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload & parse LinkedIn PDF
// @route   POST /api/students/upload-linkedin
// @access  Private (Student)
const uploadLinkedinPdf = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const pdfText = await parsePdfText(req.file.buffer);

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.linkedinText = data.text;
    await user.save();
    res.json({ message: 'LinkedIn parsed successfully', success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload & verify a certificate image via AI
// @route   POST /api/students/upload-certificate
// @access  Private (Student)
const uploadCertificate = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const { verifyCertificate, verifyCertificatePdf } = require('../services/aiService');
    const { certName, issuerName } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let verificationResult;
    let certEntry = {
      name: certName || 'Untitled Certificate',
      issuer: issuerName || 'Unknown Issuer',
      date: new Date(),
      imageType: req.file.mimetype,
      verificationStatus: 'pending',
      verificationScore: 0,
      verificationDetails: ''
    };

    if (req.file.mimetype === 'application/pdf') {
      const pdfText = await parsePdfText(req.file.buffer);
      verificationResult = await verifyCertificatePdf(pdfText, certName, issuerName);
      certEntry.pdfText = pdfText;
      certEntry.fileName = req.file.originalname;
    } else {
      const imageBase64 = req.file.buffer.toString('base64');
      verificationResult = await verifyCertificate(imageBase64, req.file.mimetype, certName, issuerName);
      certEntry.imageBase64 = imageBase64;
      certEntry.fileName = req.file.originalname;
    }

    certEntry.verificationStatus = verificationResult.verdict || 'pending';
    certEntry.verificationScore = verificationResult.confidence_score || 0;
    certEntry.verificationDetails = verificationResult.summary || '';

    user.certifications = user.certifications || [];
    user.certifications.push(certEntry);
    await user.save();

    invalidateCacheByPrefix('students:');

    res.json({
      message: 'Certificate uploaded and verified by AI.',
      verification: verificationResult,
      certification: certEntry
    });
  } catch (error) {
    console.error('Certificate upload error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { updateProfile, addProject, getProjects, uploadLinkedinPdf, uploadCertificate };
