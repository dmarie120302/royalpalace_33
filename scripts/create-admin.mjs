import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline/promises";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error(
    "Configura la URL y la clave privada de tu proyecto independiente en .env.local.",
  );
  process.exit(1);
}
async function hiddenPassword() {
  if (!process.stdin.isTTY)
    throw new Error(
      "Usa una terminal interactiva o BOOTSTRAP_ADMIN_PASSWORD en el entorno.",
    );
  process.stdout.write("Contraseña (mínimo 12 caracteres): ");
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    const finish = () => {
      process.stdin.setRawMode(false);
      process.stdin.removeListener("data", onData);
      process.stdin.pause();
      process.stdout.write("\n");
    };
    function onData(chunk) {
      for (const character of chunk.toString()) {
        if (character === "\u0003") {
          finish();
          reject(new Error("Cancelado."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          resolve(value);
          return;
        }
        if (character === "\u007f") {
          value = value.slice(0, -1);
          continue;
        }
        if (character >= " ") value += character;
      }
    }
    process.stdin.on("data", onData);
  });
}
try {
  let email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  if (!email) {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    email = await rl.question("Correo de administración: ");
    rl.close();
  }
  const password =
    process.env.BOOTSTRAP_ADMIN_PASSWORD || (await hiddenPassword());
  if (password.length < 12)
    throw new Error("Utiliza una contraseña de al menos 12 caracteres.");
  const db = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await db.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    app_metadata: { app_role: "admin" },
  });
  if (error) throw error;
  console.log(
    "Cuenta de administración creada. Ya puede entrar en la aplicación.",
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
