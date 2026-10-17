// ============================================================
//  EDIT THIS FILE to personalise the portfolio.
//  Shown in About Me, Resume, My Projects, Command Prompt and MSN.
// ============================================================
window.PROFILE = {
  name: "Medhansh Khattar",
  initials: "MK",
  photo: "photo.jpg?v=17",          // square avatar; photo-full.jpg is the full portrait
  role: "AI/ML Engineer",
  subtitle: "Founder & CEO, Yap-less · CS @ VIT Bhopal",
  location: "Navi Mumbai, Maharashtra, India",
  hostname: "MK-PC",
  tagline: "Computer science, machine learning and data analytics, with an out-of-the-box approach.",
  summary: "AI/ML-focused computer science student at VIT Bhopal and founder of Yap-less. Builds production systems (a secure WhatsApp automation platform deployed at KC Degree College), autonomous-driving agents in CARLA, real-time computer vision and research on news sentiment and stock prediction. Seeking research, programming and data analysis internships.",
  bio: [
    "Hi! I'm Medhansh, a sophomore at VIT Bhopal with a focused interest in computer science, machine learning and data analytics.",
    "I'm an out-of-the-box thinker with a track record of applying unique perspectives to complex problems, from secure messaging platforms and a CARLA self-driving agent to real-time computer vision and research on news sentiment and stock prediction.",
    "I'm looking to contribute research, programming and data analysis skills to an internship or collaborative project."
  ],
  education: [
    { school: "VIT Bhopal University", degree: "B.Tech, Computer Science", years: "Aug 2025 - Jul 2029", detail: "Expected CGPA: 8.5 - 9 · Bhopal, Madhya Pradesh",
      points: ["Coursework: Coding logic & languages; Machine & Deep Learning; Calculus, Probability, Statistics & Advanced Linear Algebra; Data Science, Data Visualization & Agentic AI",
               "Executive Member - VITB Model UN Club", "Executive Member - VITB Eureka Research Club"] },
    { school: "Apeejay School Nerul", degree: "PCM + Economics (CBSE)", years: "Apr 2022 - Jun 2025", detail: "Navi Mumbai, Maharashtra",
      points: ["Deputy Opposition Leader - Youth Parliament (2024)", "Debate Team (2024)"] }
  ],
  experience: [
    { title: "Founder & CEO", org: "Yap-less", location: "Navi Mumbai", years: "2026 - Present",
      points: ["Founded Yap-less and lead product, engineering and strategy. (More details and website coming soon.)"] },
    { title: "Freelance Software Engineer", org: "Security'26 & Club-Desk", location: "Churchgate, Mumbai", years: "Jun 2026 - Present",
      points: [
        "Developed a secure WhatsApp automation system on the Meta WhatsApp Cloud API for personalized notifications, reminders and appointment updates.",
        "Built web platform features including user authentication, account management and role-based access control.",
        "Designed a Firebase-backed backend to secure confidential user information and store real-time data.",
        "Integrated Vercel, Cloudflare, Firebase and WhatsApp APIs for reliable data synchronization.",
        "Deployed the platform for use by KC Degree College, Mumbai; further client discussions underway.",
        "Leading its evolution into a subscription-based appointment-scheduling agent for healthcare providers and local businesses."
      ] },
    { title: "Research Paper (in progress)", org: "Independent research", location: "Vashi, Navi Mumbai", years: "Jul 2026 - Present",
      points: ["Does News Sentiment Improve Stock Prediction? A comparative study using FinBERT and machine learning models for sentiment analysis on stock prices."] }
  ],
  achievements: [
    "99.8 percentile (Rank under 600) - MH-CET state entrance examination (2025)",
    "Best Delegate - Apeejay High School Model UN Conference (2024)",
    "Special Mention - Apeejay High School Model UN Conference (2023)",
    "Rank 24/450 - District Chess Championship (2023)",
    "Rank 11/450 - District Chess Championship (2022)",
    "Rank 43/400 - District Chess Championship (2018)"
  ],
  certifications: [
    "VITyarthi: Fundamentals of AI-ML · Digital Literacy · Fundamentals of Python · Programming in Java (in progress)",
    "Coursera: Deep Learning Specialization - Andrew Ng (in progress) · Data Science Specialization - IBM (in progress)",
    "9 certifications in Quantitative Finance, Algorithmic Trading & Financial Markets"
  ],
  languages: ["Hindi (native)", "English (proficient)", "French (oral proficiency)"],
  skills: {
    "Programming": ["Python", "TypeScript", "Java (learning)"],
    "AI / ML": ["Machine Learning", "Deep Learning", "Computer Vision (YOLO)", "FinBERT / NLP", "Imitation & Reinforcement Learning"],
    "Simulation": ["CARLA autonomous-driving simulator", "Orbital mechanics / N-body"],
    "Platforms": ["React", "Vite", "Firebase", "Vercel", "Cloudflare", "Meta WhatsApp Cloud API"],
    "Data": ["Data analysis", "Statistical analysis", "Data visualization", "Financial literacy"],
    "Soft skills": ["Research & writing", "Public speaking", "Teamwork", "Time management", "Communication"]
  },
  projects: [
    { name: "Portfolio XP", year: "2026", stack: ["HTML", "CSS", "JavaScript", "Canvas", "Vercel"],
      desc: "This site: a Windows XP desktop in the browser with draggable windows and icons, Paint, a Command Prompt, a calendar with reminders, and five games (Solitaire, Minesweeper, Snake, Brick Breaker, Tic-Tac-Toe). No framework, no build step.",
      github: "https://github.com/MendhiVadi/medhansh-xp", url: "https://medhansh-xp.vercel.app" },
    { name: "Autonomous Driving Agent", year: "2026", stack: ["Python", "CARLA 0.9.16", "Imitation Learning", "RL (in progress)"],
      desc: "CARLA self-driving agent with a manual driving host, a map-and-controls cockpit, an imitation-learning policy that drives from road and vehicle state, and an authenticated two-computer control link for a reinforcement-learning trainer.",
      github: "https://github.com/MendhiVadi/autonomous-driving-agent", url: "" },
    { name: "Vision Assist", year: "2026", stack: ["Python", "YOLO (Ultralytics)", "Computer Vision", "Text-to-Speech"],
      desc: "Real-time webcam scene description for visually impaired users: detects objects with YOLO and says what it sees and where (\"very close: a person ahead, two chairs on the left\"), as a web app with an API or a desktop app.",
      github: "https://github.com/MendhiVadi/vision-assist", url: "https://vision-assist-two.vercel.app" },
    { name: "Asteroid Watch", year: "2026", stack: ["TypeScript", "Vite", "3D Graphics", "Python", "Orbital Mechanics"],
      desc: "3D browser dashboard of 42,670 known near-Earth asteroids from NASA JPL data. Fast Kepler orbits for every object, accurate N-body simulation for the one you pick, and impact / approaching / receding screening to 2100.",
      github: "https://github.com/MendhiVadi/asteroid-watch", url: "" },
    { name: "Land Dispute", year: "2026", stack: ["TypeScript", "React", "Firebase", "Firestore"],
      desc: "AI-augmented platform for location-based land-grievance reporting and staff review, with Forest Rights Act claim monitoring that puts scattered records on one interactive map.",
      github: "https://github.com/MendhiVadi/FI-Monitoring", url: "https://forest-watch-eight.vercel.app" },
    { name: "Carbon Logistics", year: "2026", stack: ["React", "Vite", "Firebase", "Vercel", "Live ADS-B data"],
      desc: "India-focused multimodal shipping planner that compares routes, modes, cost, ETA and emissions, with live flight positions, timetable-based train and ferry tracking, and secure owner-scoped parcel bookings.",
      github: "", url: "https://carbon-logistics.vercel.app" },
    { name: "Club-Desk WhatsApp Platform", year: "2026", stack: ["WhatsApp Cloud API", "Firebase", "Vercel", "Cloudflare"],
      desc: "Secure WhatsApp automation for notifications, reminders and appointments with authentication and role-based access; deployed at KC Degree College, Mumbai. (Private client project.)",
      github: "", url: "", resume: false },
    { name: "News Sentiment & Stocks", year: "2026", stack: ["Python", "FinBERT", "Machine Learning"],
      desc: "Research paper: does news sentiment improve stock prediction? Comparing FinBERT sentiment features across machine-learning models.",
      github: "", url: "", resume: false }
  ],
  links: {
    email: "medhanshkhattar.in@gmail.com",
    github: "https://github.com/MendhiVadi",
    linkedin: "https://www.linkedin.com/in/medhansh-khattar-635271366",
    twitter: "",                                           // optional: leave empty to hide
    yapless: "",                                           // Yap-less site: shows "coming soon" until you add a URL
    website: "",                                           // optional: leave empty to hide
    resumePdf: "resume.pdf"                                // exported from the Google Doc resume
  }
};
