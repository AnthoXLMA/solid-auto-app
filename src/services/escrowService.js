const escrows = {}; // Stockage temporaire frontend (juste pour l’état UI)

export const createEscrow = async (reportId, amount, setPaymentStatus) => {
  try {
    setPaymentStatus("pending");
    const res = await fetch("/api/create-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, amount }),
    });
    const data = await res.json();
    escrows[reportId] = { clientSecret: data.clientSecret, status: "pending" };
    console.log("Escrow créé côté backend :", escrows[reportId]);
  } catch (err) {
    console.error(err);
    setPaymentStatus("error");
  }
};

export const releaseEscrow = async (reportId, setPaymentStatus) => {
  try {
    const escrow = escrows[reportId];
    if (!escrow) throw new Error("Escrow introuvable");
    await fetch("/api/capture-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId: escrow.clientSecret }),
    });
    escrow.status = "released";
    setPaymentStatus("released");
  } catch (err) {
    console.error(err);
    setPaymentStatus("error");
  }
};

export const refundEscrow = async (reportId, setPaymentStatus) => {
  try {
    const escrow = escrows[reportId];
    if (!escrow) throw new Error("Escrow introuvable");
    await fetch("/api/refund-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId: escrow.clientSecret }),
    });
    escrow.status = "refunded";
    setPaymentStatus("refunded");
  } catch (err) {
    console.error(err);
    setPaymentStatus("error");
  }
};
