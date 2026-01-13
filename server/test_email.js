const nodemailer = require('nodemailer');

async function sendTestEmail() {
    console.log("⏳ Attempting to send email...");

    // 1. SETUP
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            // ⬇️ MAKE SURE THIS IS CORRECT
            user: 'www.seosiri@gmail.com', 
            
            // ⬇️ THIS MUST BE THE 16-DIGIT APP PASSWORD (NO SPACES)
            // NOT your normal login password!
            pass: 'hmvq zimj vxoy jpvt' 
        }
    });

    // 2. SEND
    try {
        let info = await transporter.sendMail({
            from: '"Test Bot" <www.seosiri@gmail.com>',
            to: 'info@seosiri.com', // Sending to yourself to test
            subject: "System Test 🚀", 
            text: "If you are reading this, the email system is working perfectly!", 
        });
        console.log("✅ SUCCESS! Email sent.");
        console.log("Message ID:", info.messageId);
    } catch (error) {
        console.log("❌ FAILED!");
        console.log("Error Message:", error.message);
        
        if (error.message.includes('Invalid login')) {
            console.log("👉 CAUSE: Your App Password is wrong or missing.");
        }
    }
}

sendTestEmail();