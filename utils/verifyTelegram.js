import crypto from "crypto";

export const verifyTelegramAuth = (initData, botToken) => {
  const urlParams = new URLSearchParams(initData);
  const dataCheckArr = [];

  urlParams.forEach((val, key) => {
    if (key !== "hash") dataCheckArr.push(`${key}=${val}`);
  });

  dataCheckArr.sort();
  const dataCheckString = dataCheckArr.join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const hash = crypto.createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const hashFromTelegram = urlParams.get("hash");

  return hash === hashFromTelegram;
};
