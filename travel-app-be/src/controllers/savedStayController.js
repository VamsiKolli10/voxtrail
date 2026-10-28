const { db, FieldValue } = require("../config/firebaseAdmin");
const { createErrorResponse, ERROR_CODES } = require("../utils/errorHandler");

const SAVED_STAY_LIMIT = 100;
const ownerRefs = (uid) => {
  const user = db.collection("users").doc(uid);
  return {
    stays: user.collection("saved_stays"),
    counter: user.collection("preferences").doc("saved_stays"),
  };
};
const isoDate = (value) => {
  const date = value?.toDate ? value.toDate() : value;
  return date instanceof Date ? date.toISOString() : null;
};

exports.listSaved = async (req, res) => {
  const { stays } = ownerRefs(req.user.uid);
  const snapshot = await stays
    .orderBy("createdAt", "desc")
    .limit(SAVED_STAY_LIMIT)
    .get();
  res.json({
    items: snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        placeId: doc.id,
        nickname: data.nickname,
        notes: data.notes || "",
        createdAt: isoDate(data.createdAt),
        updatedAt: isoDate(data.updatedAt),
      };
    }),
  });
};

exports.saveStay = async (req, res) => {
  const { stays, counter } = ownerRefs(req.user.uid);
  const ref = stays.doc(req.params.placeId);
  // A transaction makes repeated saves idempotent and enforces the cap even
  // when multiple devices add stays concurrently. Store no Places content.
  const result = await db.runTransaction(async (transaction) => {
    const [saved, metadata] = await Promise.all([
      transaction.get(ref),
      transaction.get(counter),
    ]);
    const count = metadata.data()?.count || 0;
    if (!saved.exists && count >= SAVED_STAY_LIMIT) return { full: true };
    transaction.set(ref, {
      nickname: req.body.nickname,
      notes: req.body.notes,
      createdAt: saved.exists
        ? saved.data().createdAt
        : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (!saved.exists) transaction.set(counter, { count: count + 1 });
    return { created: !saved.exists };
  });
  if (result.full) {
    return res
      .status(409)
      .json(
        createErrorResponse(
          409,
          ERROR_CODES.BAD_REQUEST,
          `You can save up to ${SAVED_STAY_LIMIT} stays. Remove one before adding another.`,
        ),
      );
  }
  res.status(result.created ? 201 : 200).json({ placeId: ref.id });
};

exports.removeStay = async (req, res) => {
  const { stays, counter } = ownerRefs(req.user.uid);
  const ref = stays.doc(req.params.placeId);
  await db.runTransaction(async (transaction) => {
    const [saved, metadata] = await Promise.all([
      transaction.get(ref),
      transaction.get(counter),
    ]);
    if (!saved.exists) return;
    transaction.delete(ref);
    transaction.set(counter, {
      count: Math.max(0, (metadata.data()?.count || 0) - 1),
    });
  });
  // Already removed on another device is a successful removal too.
  res.json({ ok: true });
};
