// Gera payload Pix BR Code (EMV) estático com valor fixo.
function tlv(id: string, value: string): string {
  return id + String(value.length).padStart(2, "0") + value;
}

function noAccents(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim();
}

function crc16ccitt(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function pixConfig() {
  return {
    key: process.env.PIX_KEY || "sua-chave-pix-aqui",
    name: (process.env.PIX_NAME || "Noivos").slice(0, 25),
    city: (process.env.PIX_CITY || "Brasil").slice(0, 15),
  };
}

export function buildPixBrcode(key: string, name: string, city: string, value: number): string {
  const gui = tlv("00", "br.gov.bcb.pix") + tlv("01", key);
  const payload =
    tlv("00", "01") +
    tlv("26", gui) +
    tlv("52", "0000") +
    tlv("53", "986") +
    tlv("54", value.toFixed(2)) +
    tlv("58", "BR") +
    tlv("59", noAccents(name).toUpperCase().slice(0, 25) || "RECEBEDOR") +
    tlv("60", noAccents(city).toUpperCase().slice(0, 15) || "BRASIL") +
    tlv("62", tlv("05", "***")) +
    "6304";
  return payload + crc16ccitt(payload);
}
