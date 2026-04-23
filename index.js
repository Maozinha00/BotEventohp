import "dotenv/config";
import express from "express";
import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  REST
} from "discord.js";

// 🌐 KEEP ALIVE
const app = express();
app.get("/", (_, res) => res.send("Bot online 🔥"));
app.listen(3000);

// 🔐 ENV
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// 🛡️ CARGO EM SERVIÇO
const CARGO_SERVICO = "1492553421973356795";

// 🏆 PREMIOS
const CARGO_1 = "1477683902100410424";
const CARGO_2 = "1495374426815074304";
const CARGO_3 = "1495374557404594267";

// 🧠 SISTEMA
let eventoAtivo = false;
let msgEventoId = null;
const ranking = new Map();

// 🤖 BOT
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const rest = new REST({ version: "10" }).setToken(TOKEN);

// BOTÕES
function rowEvento() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("atendimento").setLabel("🏥 Atendimento +1").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("chamado").setLabel("📞 Chamado +2").setStyle(ButtonStyle.Primary)
  );
}

const START = new Date("2026-04-24T19:00:00");
const END = new Date("2026-04-24T20:30:00");

setInterval(async () => {
  const now = new Date();

  if (!eventoAtivo && now >= START && now < END) {
    eventoAtivo = true;
    const channel = await client.channels.fetch(GUILD_ID);

    const embed = new EmbedBuilder()
      .setColor("Green")
      .setTitle("🏥 Evento Iniciado")
      .setDescription("Atendimento = 1 | Chamado = 2");

    const msg = await channel.send({ embeds: [embed], components: [rowEvento()] });
    msgEventoId = msg.id;
  }

  if (eventoAtivo && now >= END) {
    eventoAtivo = false;

    const channel = await client.channels.fetch(GUILD_ID);

    const top = [...ranking.entries()]
      .sort((a,b)=>b[1]-a[1])
      .slice(0,3);

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle("🏁 Resultado Final")
      .setDescription(`
🥇 <@${top[0]?.[0]||"?"}> ${top[0]?.[1]||0}
🥈 <@${top[1]?.[0]||"?"}> ${top[1]?.[1]||0}
🥉 <@${top[2]?.[0]||"?"}> ${top[2]?.[1]||0}
`);

    if (msgEventoId) {
      const msg = await channel.messages.fetch(msgEventoId);
      await msg.edit({ embeds: [embed], components: [] });
    }
  }
}, 30000);

client.on("interactionCreate", async (i) => {
  if (!i.isButton()) return;

  const member = i.member;
  const id = i.user.id;

  if (!member.roles.cache.has(CARGO_SERVICO)) {
    return i.reply({ content: "❌ Só em serviço", ephemeral: true });
  }

  if (!eventoAtivo) {
    return i.reply({ content: "❌ Evento fechado", ephemeral: true });
  }

  if (i.customId === "atendimento") {
    ranking.set(id, (ranking.get(id)||0)+1);
    return i.reply({ content: "+1", ephemeral: true });
  }

  if (i.customId === "chamado") {
    ranking.set(id, (ranking.get(id)||0)+2);
    return i.reply({ content: "+2", ephemeral: true });
  }
});

client.once("ready", ()=>console.log("🔥 Online"));

client.login(TOKEN);
