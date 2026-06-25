const tls = require('tls');
const dotenv = require('dotenv');
const dns = require('node:dns'); // <-- 1. Import the native DNS module

// <-- 2. Force IPv4 resolution globally for this script to fix Render's ENETUNREACH error
dns.setDefaultResultOrder('ipv4first'); 

dotenv.config();

const fromEmail = process.env.EMAIL_USER;
const appPassword = process.env.EMAIL_PASS;

// Native SMTP Function - 0 external libraries
const sendNativeEmail = (toEmail, toName, subject, htmlContent) => {
    return new Promise((resolve, reject) => {
        // Port 465 for secure TLS connection
        const socket = tls.connect(465, 'smtp.gmail.com', () => {
            console.log('Connected to Gmail Server...');
        });

        let step = 0;
        let serverResponse = '';

        // SMTP protocol commands
        const commands = [
            `EHLO localhost\r\n`,
            `AUTH LOGIN\r\n`,
            `${Buffer.from(fromEmail).toString('base64')}\r\n`,
            `${Buffer.from(appPassword).toString('base64')}\r\n`,
            `MAIL FROM:<${fromEmail}>\r\n`,
            `RCPT TO:<${toEmail}>\r\n`,
            `DATA\r\n`,
            `From: "Eventora" <${fromEmail}>\r\nTo: ${toName} <${toEmail}>\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${htmlContent}\r\n.\r\n`,
            `QUIT\r\n`
        ];

        socket.on('data', (data) => {
            serverResponse += data.toString();
            
            // Check if server is ready for the next command (Ends with 3 digits and a space)
            if (serverResponse.match(/(?:^|\n)\d{3} /)) {
                if (step < commands.length) {
                    socket.write(commands[step]);
                    step++;
                    serverResponse = ''; // Clear for next response
                } else {
                    socket.end();
                    resolve(true);
                }
            }
        });

        socket.on('error', (error) => {
            console.error('SMTP Error:', error);
            reject(error);
        });
    });
};

const sendBookingEmail = async (userEmail, userName, eventTitle) => {
    try {
        const subject = `Booking Confirmed: ${eventTitle}`;
        const html = `
            <h2>Hi ${userName}!</h2>
            <p>Your booking for the event <strong>${eventTitle}</strong> is successfully confirmed.</p>
            <p>Thank you for choosing Eventora.</p>
        `;
        
        await sendNativeEmail(userEmail, userName, subject, html);
        console.log(`Booking email successfully sent to ${userEmail}`);
    } catch (error) {
        console.error('Failed to send booking email:', error);
    }
};

const sendOTPEmail = async (userEmail, otp, type) => {
    try {
        const title = type === 'account_verification' ? 'Verify your Eventora Account' : 'Eventora Booking Verification';
        const msg = type === 'account_verification'
            ? 'Please use the following OTP to verify your new Eventora account.'
            : 'Please use the following OTP to verify and confirm your event booking.';

        const html = `
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                <h2 style="color: #111;">${title}</h2>
                <p style="color: #555; font-size: 16px;">${msg}</p>
                <div style="margin: 20px auto; padding: 15px; font-size: 24px; font-weight: bold; background: #f4f4f4; width: max-content; letter-spacing: 5px;">
                    ${otp}
                </div>
                <p style="color: #999; font-size: 12px;">This code expires in 5 minutes. If you didn't request this, please ignore this email.</p>
            </div>
        `;

        await sendNativeEmail(userEmail, 'User', title, html);
        console.log(`OTP successfully sent to ${userEmail}`);
    } catch (error) {
        console.error('Failed to send OTP email:', error);
    }
};

module.exports = { sendBookingEmail, sendOTPEmail };