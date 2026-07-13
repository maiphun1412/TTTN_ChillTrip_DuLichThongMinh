import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpEmail({
  to,
  otp,
  purpose,
}: {
  to: string;
  otp: string;
  purpose: "REGISTER" | "FORGOT_PASSWORD";
}) {
  const subject =
    purpose === "REGISTER"
      ? "Xác thực tài khoản ChillTrip"
      : "Đặt lại mật khẩu ChillTrip";

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2>${subject}</h2>
        <p>Mã OTP của bạn là:</p>
        <h1 style="letter-spacing:4px">${otp}</h1>
        <p>Mã có hiệu lực trong 5 phút.</p>
      </div>
    `,
  });
}