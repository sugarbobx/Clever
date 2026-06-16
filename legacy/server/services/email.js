const FROM_ADDRESS = 'Clever <notifications@thecleverest.com>';

let resend = null;
if (process.env.RESEND_API_KEY) {
  try {
    const { Resend } = require('resend');
    resend = new Resend(process.env.RESEND_API_KEY);
  } catch { /* resend not installed */ }
}

async function sendEmail(to, subject, html) {
  if (resend) {
    await resend.emails.send({ from: FROM_ADDRESS, to, subject, html });
  } else {
    console.log('\n[EMAIL]', JSON.stringify({ to, subject, html }, null, 2));
  }
}

const STATUS_MESSAGES = {
  'En cours':    (ref) => `Votre demande <strong>${ref}</strong> est en cours de traitement par notre équipe.`,
  'In Progress': (ref) => `Votre demande <strong>${ref}</strong> est en cours de traitement par notre équipe.`,
  'Livré':       (ref) => `Bonne nouvelle ! Votre document pour la demande <strong>${ref}</strong> est prêt. Connectez-vous pour le télécharger.`,
  'Delivered':   (ref) => `Bonne nouvelle ! Votre document pour la demande <strong>${ref}</strong> est prêt. Connectez-vous pour le télécharger.`,
  'Rejeté':      (ref) => `Votre demande <strong>${ref}</strong> a été rejetée. Contactez-nous pour plus d'informations.`,
  'Cancelled':   (ref) => `Votre demande <strong>${ref}</strong> a été annulée.`,
};

function html(name, body) {
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px">
    <h2 style="color:#1A3C34;margin-bottom:8px">Clever — TheCleverest S.A.R.L</h2>
    <p style="color:#555">Bonjour ${name},</p>
    <p style="color:#333">${body}</p>
    <p style="color:#999;font-size:12px;margin-top:32px">© TheCleverest S.A.R.L · Yaoundé, Cameroun</p>
  </div>`;
}

async function notifyStatusChange(clientEmail, clientName, referenceNumber, newStatus) {
  const bodyFn = STATUS_MESSAGES[newStatus];
  if (!bodyFn) return;
  await sendEmail(
    clientEmail,
    `Clever — Mise à jour de votre demande ${referenceNumber}`,
    html(clientName, bodyFn(referenceNumber))
  );
}

async function notifyRequestSubmitted(clientEmail, clientName, referenceNumber) {
  await sendEmail(
    clientEmail,
    `Clever — Demande ${referenceNumber} reçue`,
    html(clientName, `Votre demande <strong>${referenceNumber}</strong> a bien été soumise. Délai de traitement estimé : 48h.`)
  );
}

async function notifySlaAlert(agentEmail, agentName, referenceNumber) {
  await sendEmail(
    agentEmail,
    `Clever — SLA dépassé : ${referenceNumber}`,
    html(agentName, `La demande <strong>${referenceNumber}</strong> a dépassé son délai de traitement (48h). Veuillez la traiter en priorité.`)
  );
}

module.exports = { notifyStatusChange, notifyRequestSubmitted, notifySlaAlert };
