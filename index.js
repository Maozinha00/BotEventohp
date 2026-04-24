import "dotenv/config";
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

/* ================= CONFIG ================= */

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const CANAL_EVENTO = "1492553421973356795";
const STAFF_ROLE = "1490431614055088128";

const CARGO_1 = "1477683902100410424";
const CARGO_2 = "1495374426815074304";
const CARGO_3 = "1495374557404594267";

/* ================= DADOS ================= */

const ranking = new Map(); // { id: { atendimento: 0, chamado: 0 } }
const cooldown = new Map();

let eventoAtivo = false;
let msgEventoId = null;

/* ================= BOTÕES ================= */

function rowEvento() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("atendimento")
      .setLabel("ATENDIMENTO")
      .setEmoji("🩺")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("chamado")
      .setLabel("CHAMADO")
      .setEmoji("📞")
      .setStyle(ButtonStyle.Primary)
  );
}

/* ================= COOLDOWN ================= */

function checkCooldown(id) {
  const now = Date.now();
  const last = cooldown.get(id) || 0;

  if (now - last < 5000) return true;

  cooldown.set(id, now);
  return false;
}

/* ================= UPDATE EVENTO ================= */

async function updateEvento(client) {
  if (!eventoAtivo) return;

  const canal = await client.channels.fetch(CANAL_EVENTO);

  const sorted = [...ranking.entries()]
    .sort((a, b) => {
      const totalA = a[1].atendimento + a[1].chamado;
      const totalB = b[1].atendimento + b[1].chamado;
      return totalB - totalA;
    })
    .slice(0, 3);

  const medalhas = ["🥇", "🥈", "🥉"];

  const lista = sorted.length
    ? sorted.map(([id, d], i) =>
        `${medalhas[i]} <@${id}> • 🩺 ${d.atendimento} | 📞 ${d.chamado}`
      ).join("\n")
    : "Sem dados";

  const embed = new EmbedBuilder()
    .setColor("#22c55e")
    .setTitle("🏥 EVENTO HOSPITAL BELLA • AO VIVO")
    .setDescription(`
🏆 **TOP 3**
${lista}

────────────────────────────
⏰ Evento ativo (19h às 21h)
`)
    .setTimestamp();

  if (msgEventoId) {
    const msg = await canal.messages.fetch(msgEventoId);
    await msg.edit({ embeds: [embed], components: [rowEvento()] });
  } else {
    const msg = await canal.send({ embeds: [embed], components: [rowEvento()] });
    msgEventoId = msg.id;
  }
}

/* ================= FINALIZAR EVENTO ================= */

async function finalizarEvento(client) {
  eventoAtivo = false;

  const canal = await client.channels.fetch(CANAL_EVENTO);
  const guild = canal.guild;

  const sorted = [...ranking.entries()]
    .sort((a, b) => {
      const totalA = a[1].atendimento + a[1].chamado;
      const totalB = b[1].atendimento + b[1].chamado;
      return totalB - totalA;
    });

  const winners = sorted.slice(0, 3);

  if (winners[0]) await guild.members.fetch(winners[0][0]).then(m => m.roles.add(CARGO_1));
  if (winners[1]) await guild.members.fetch(winners[1][0]).then(m => m.roles.add(CARGO_2));
  if (winners[2]) await guild.members.fetch(winners[2][0]).then(m => m.roles.add(CARGO_3));

  await canal.send({
    embeds: [
      new EmbedBuilder()
        .setColor("Gold")
        .setTitle("🏆 RESULTADO DO EVENTO")
        .setDescription(
          winners.map(([id, d], i) =>
            `#${i + 1} <@${id}> • 🩺 ${d.atendimento} | 📞 ${d.chamado}`
          ).join("\n")
        )
    ]
  });

  ranking.clear();
}

/* ================= AVISO ================= */

async function avisoEvento(client) {
  const canal = await client.channels.fetch(CANAL_EVENTO);

  await canal.send({
    embeds: [
      new EmbedBuilder()
        .setColor("#facc15")
        .setTitle("⚠️ EVENTO EM 20 MINUTOS")
        .setDescription("Preparem-se médicos!")
    ]
  });
}

/* ================= CLIENT ================= */

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const rest = new REST({ version: "10" }).setToken(TOKEN);

/* ================= READY ================= */

client.once("ready", async () => {
  console.log("🔥 Bot Online");

  setInterval(() => {
    const now = new Date();
    const hora = now.getHours();
    const minuto = now.getMinutes();

    // aviso 18:40
    if (hora === 18 && minuto === 40) avisoEvento(client);

    // iniciar 19:00
    if (hora === 19 && minuto === 0 && !eventoAtivo) {
      eventoAtivo = true;
    }

    // finalizar 21:00
    if (hora === 21 && minuto === 0 && eventoAtivo) {
      finalizarEvento(client);
    }

  }, 60000);

  setInterval(() => updateEvento(client), 5000);
});

/* ================= INTERAÇÕES ================= */

client.on("interactionCreate", async (interaction) => {

  if (!interaction.isButton()) return;

  const id = interaction.user.id;

  if (!eventoAtivo) {
    return interaction.reply({
      content: "❌ Evento não está ativo",
      ephemeral: true
    });
  }

  if (checkCooldown(id)) {
    return interaction.reply({
      content: "⏳ Aguarde 5 segundos",
      ephemeral: true
    });
  }

  if (!ranking.has(id)) {
    ranking.set(id, { atendimento: 0, chamado: 0 });
  }

  if (interaction.customId === "atendimento") {
    ranking.get(id).atendimento++;
  }

  if (interaction.customId === "chamado") {
    ranking.get(id).chamado++;
  }

  return interaction.reply({
    content: "✅ Registrado!",
    ephemeral: true
  });

});

client.login(TOKEN);
