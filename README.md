📧 NIELIT Automation Mailer — 10x Faster Distribution
NIELIT Automation Mailer is a specialized desktop application developed during my internship at the NIELIT Delhi Centre. It automates the distribution of digital certificates and scorecards, transforming a slow manual process into a high-speed, one-click operation.

🚀 The Problem
At the end of every course, staff had to manually find certificates for hundreds of students and send them one by one. This was time-consuming and prone to human error (sending the wrong file to the wrong student).

✅ The Solution
I built a cross-platform desktop tool using Electron.js and React that:

Matches Files Automatically: Uses smart logic to pair student Roll Numbers from a CSV with the correct PDF files in a local folder.

Batch Distribution: Sends personalized emails to hundreds of students simultaneously using Nodemailer.

Generates Evidence: Automatically creates a CSV log of all sent and failed emails for administrative records.

✨ Key Features
Intelligent Key Matching: Pairs files based on a ${ROLL_NO}_${COURSE_ID} logic to ensure 100% accuracy.

Concurrency Control: Uses p-limit to manage email traffic and prevent SMTP server blocks.

Direct Local Access: Leverages Electron's dialog and fs modules to safely access local file directories.

Professional Templates: Sends congratulations messages with official NIELIT links and branding.

🛠️ Tech Stack
Framework: Electron.js (Desktop Environment).

Frontend: React.js, Tailwind CSS.

Backend Runtime: Node.js.

Libraries: Nodemailer (Email), csv-parse (Data), p-limit (Performance).

🧠 Engineering Highlights
IPC Communication: Implemented secure Inter-Process Communication (IPC) between the React renderer and Node.js main process to handle heavy file-system operations.

Security: Developed the system to utilize .env files for SMTP credentials, ensuring sensitive API and login data are never hardcoded.

Robust Parsing: Integrated asynchronous streams for CSV reading, allowing the app to handle large student databases without freezing the UI.

⚙️ How to Run
Clone the Repo:

Bash

git clone https://github.com/SurjeetMandal/NIELIT-Mailer.git
Install Dependencies:

Bash

npm install
Setup Environment: Add your SMTP credentials in a .env file.

Launch App:

Bash

npm run dev
Developer: Surjeet Mandal

Institution: Delhi Global Institute of Technology

Internship: NIELIT Delhi Centre

Role: Final-Year B.Tech Student (2026 Grad)
