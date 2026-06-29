import { Link } from 'react-router-dom';

const features = [
  { title: 'Resume Analysis', desc: 'Get instant AI-powered feedback on your resume.' },
  { title: 'ATS Compatibility Check', desc: 'See how well your resume passes ATS filters.' },
  { title: 'Skill Gap Detection', desc: 'Discover the skills you are missing for your dream job.' },
  { title: 'AI Suggestions', desc: 'Receive concrete, actionable improvement tips.' },
  { title: 'Resume History', desc: 'Track every analysis you have ever run.' },
  { title: 'Local AI (Llama)', desc: 'Runs on a local Llama model via Ollama - no API key needed.' }
];

const Landing = () => (
  <div>
    <section className="max-w-4xl mx-auto text-center py-20 px-4">
      <h1 className="text-4xl md:text-5xl font-bold text-cocoa mb-4">
        Land your next job with an AI-powered resume review
      </h1>
      <p className="text-taupe text-lg mb-8">
        Upload your resume, paste a job description, and get a match score, ATS score,
        and AI recommendations in seconds.
      </p>
      <Link to="/register" className="bg-primary text-white px-6 py-3 rounded-lg text-lg font-medium shadow-sm hover:bg-primaryDark">
        Get Started Free
      </Link>
    </section>

    <section className="max-w-6xl mx-auto px-4 py-12 grid md:grid-cols-3 gap-6">
      {features.map((f) => (
        <div key={f.title} className="bg-parchment border border-stone-200 rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-lg mb-2 text-cocoa">{f.title}</h3>
          <p className="text-taupe text-sm">{f.desc}</p>
        </div>
      ))}
    </section>

    <section className="max-w-4xl mx-auto px-4 py-12 text-center">
      <h2 className="text-2xl font-bold mb-4">How it works</h2>
      <div className="grid md:grid-cols-3 gap-6 text-left">
        <div className="bg-parchment border border-stone-200 rounded-xl shadow-sm p-6">
          <span className="text-primary font-bold">1. </span>Upload your resume (PDF or DOCX)
        </div>
        <div className="bg-parchment border border-stone-200 rounded-xl shadow-sm p-6">
          <span className="text-primary font-bold">2. </span>Paste the job description
        </div>
        <div className="bg-parchment border border-stone-200 rounded-xl shadow-sm p-6">
          <span className="text-primary font-bold">3. </span>Get your AI-powered report
        </div>
      </div>
    </section>
  </div>
);

export default Landing;
