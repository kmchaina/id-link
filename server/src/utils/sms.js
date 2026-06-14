// SMS gateway stub — replace body of sendSMS with Selcom/Pesapal/AzamPay SDK call in production

async function sendSMS(phone, message) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n[SMS STUB] TO: ${phone}\n[SMS STUB] MSG: ${message}\n`);
    return;
  }

  // TODO: integrate with chosen aggregator
  // Example Selcom call:
  // const response = await fetch(process.env.SMS_API_URL, {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${process.env.SMS_API_KEY}`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ to: phone, from: process.env.SMS_SENDER_ID, message }),
  // });
  // if (!response.ok) throw new Error(`SMS failed: ${response.statusText}`);
}

module.exports = { sendSMS };
