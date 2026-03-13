import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import twilio from 'twilio';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, phone, sessionUrl } = body;

    if (!sessionUrl) {
      return NextResponse.json({ error: 'Session URL is required' }, { status: 400 });
    }

    const promises = [];

    // 1. Fire off Email via Nodemailer
    if (email) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: '🚀 You have been invited to a CollabCode Session!',
        text: `Your team has requested your expertise. Join the real-time pair programming session here: ${sessionUrl}`,
      };

      promises.push(transporter.sendMail(mailOptions));
    }

    // 2. Fire off SMS via Twilio
    if (phone) {
      const twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      promises.push(
        twilioClient.messages.create({
          body: `CollabCode Alert: You've been invited to a live coding session. Join here: ${sessionUrl}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone,
        })
      );
    }

    // Await all notification attempts simultaneously for speed
    await Promise.all(promises);

    return NextResponse.json({ success: true, message: 'Invites sent successfully.' }, { status: 200 });
  } catch (error: any) {
    console.error('Notification Error:', error);
    return NextResponse.json({ error: 'Failed to send invites', details: error.message }, { status: 500 });
  }
}