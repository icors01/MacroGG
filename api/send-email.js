// Legacy arbitrary-code mail delivery is intentionally disabled.
// Authentication emails are issued by Firebase Authentication instead.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(410).json({ error: 'This email endpoint has been retired.' });
}
