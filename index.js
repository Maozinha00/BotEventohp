import "dotenv/config";
import express from "express";
import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder
} from "discord.js";

// 🌐 KEEP ALIVE
const app = express();
app.get("/", (_, res) => res.send("Bot online 🔥"));
app.listen(3000);

// 🔐 ENV
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// 🛡️ CARGO EM SERVIÇO (SÓ ESSE PODE PARTICIPAR)
const CARGO_SERVICO = "1492553421973356795";

// 🏆 CARGOS DE PREMIAÇÃO
const CARGO_1 = "1477683902100410424"; // 1º lugar
const CARGO_2 = "1495374426815074304"; // 2º lugar
const CARGO_3 = "1495374557404594267"; // 3º lugar

// 🧠 SISTEMA
let eventoAtivo = false;
let msgEventoId = null;
const ranking = new Map();

// 🤖 BOT
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const rest = new REST({ version: "10" }).setToken(TOKEN);

// 🔘 BOTÕES
function rowEvento() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("atendimento")
      .setLabel("🏥 Atendimento (+1)")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("chamado")
      .setLabel("📞 Chamado (+2)")
      .setStyle(ButtonStyle.Primary)
  );
}

// 📅 HORÁRIO DO EVENTO
const EVENTO_START = new Date("2026-04-24T19:00:00");
const EVENTO_END = new Date("2026-04-24T20:30:00");

// 🧠 CHECAR EVENTO AUTOMÁTICO
setInterval(async () => {
  const agora = new Date();

  // ABRIR
  if (!eventoAtivo && agora >= EVENTO_START && agora < EVENTO_END) {
    eventoAtivo = true;
    console.log("📢 Evento iniciado");

    const canal = await client.channels.fetch(GUILD_ID);

    const embed = new EmbedBuilder()
      .setColor("#00ff00")
      .setTitle("🏥 EVENTO HOSPITAL BELLA INICIADO")
      .setDescription(`
📅 Data: 24/04/2026
⏰ 19:00 até 20:30

🏆 REGRAS:
• Atendimento = 1 ponto
• Chamado = 2 pontos

🟢 Apenas quem está em SERVIÇO pode participar
      `);

    const msg = await canal.send({
      embeds: [embed],
      components: [rowEvento()]
    });

    msgEventoId = msg.id;
  }

  // FECHAR
  if (eventoAtivo && agora >= EVENTO_END) {
    eventoAtivo = false;

    const canal = await client.channels.fetch(GUILD_ID);

    let top = [...ranking.entries()]
      .sort((a,b) => b[1] - a[1])
      .slice(0, 3);

    const embed = new EmbedBuilder()
      .setColor("#ff0000")
      .setTitle("🏁 EVENTO FINALIZADO")
      .setDescription(`
🏆 RESULTADO FINAL:

🥇 <@${top[0]?.[0] || "Nenhum"}> — ${top[0]?.[1] || 0} pts
🥈 <@${top[1]?.[0] || "Nenhum"}> — ${top[1]?.[1] || 0} pts
🥉 <@${top[2]?.[0] || "Nenhum"}> — ${top[2]?.[1] || 0} pts
      `);

    if (msgEventoId) {
      const msg = await canal.messages.fetch(msgEventoId);
      await msg.edit({ embeds: [embed], components: [] });
    }
  }

}, 30000);

// 🎯 INTERAÇÕES
client.on("interactionCreate", async (i) => {
  if (!i.isButton()) return;

  const member = i.member;
  const id = i.user.id;

  // 🚫 SÓ EM SERVIÇO PODE
  if (!member.roles.cache.has(CARGO_SERVICO)) {
    return i.reply({ content: "❌ Apenas EM SERVIÇO pode participar!", ephemeral: true });
  }

  if (!eventoAtivo) {
    return i.reply({ content: "❌ Evento não está ativo", ephemeral: true });
  }

  // 🏥 Atendimento = 1 ponto
  if (i.customId === "atendimento") {
    ranking.set(id, (ranking.get(id) || 0) + 1);
    return i.reply({ content: "+1 ponto (Atendimento)", ephemeral: true });
  }

  // 📞 Chamado = 2 pontos
  if (i.customId === "chamado") {
    ranking.set(id, (ranking.get(id) || 0) + 2);
    return i.reply({ content: "+2 pontos (Chamado)", ephemeral: true });
  }
});

// 🚀 LOGIN
client.login(TOKEN);
