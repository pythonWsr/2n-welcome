// decrypt.js – 前端解密模块
export async function decryptText(encryptedBase64, privateKeyPem) {
  try {
    // 私钥可能包含URL编码的换行符，先解码一次
    let pem = privateKeyPem;
    if (pem.includes('%')) {
      pem = decodeURIComponent(pem);
    }
    // 去除可能的头尾空白
    pem = pem.trim();

    // base64解码密文
    const cipherBytes = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

    // 导入私钥
    const pemHeader = '-----BEGIN PRIVATE KEY-----';
    const pemFooter = '-----END PRIVATE KEY-----';
    const pemContents = pem
      .replace(pemHeader, '')
      .replace(pemFooter, '')
      .replace(/\n/g, '')
      .trim();
    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey.buffer,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['decrypt']
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      cipherBytes.buffer
    );

    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error('解密失败:', e);
    return null;
  }
}

export async function decryptImage(encryptedBase64, privateKeyPem) {
  const decryptedBase64 = await decryptText(encryptedBase64, privateKeyPem);
  if (!decryptedBase64) return '';
  // 尝试直接作为 data URL 显示
  if (decryptedBase64.startsWith('data:')) {
    return decryptedBase64;
  }
  // 假设它是纯 base64（png），包装为 data URL
  return `data:image/png;base64,${decryptedBase64}`;
}