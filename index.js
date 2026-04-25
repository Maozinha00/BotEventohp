import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags
} from "discord.js";

/* ================= CONFIG ================= */

const TOKEN = process.env.TOKEN;

const CANAL_EVENTO = "1477683908026961940";
const CANAL_LOGS = "1495370353193521182";

const CARGO_PARTICIPANTE = "1492553421973356795";
const CARGO_1 = "1477683902100410424";
const CARGO_2 = "1495374426815074304";
const CARGO_3 = "1495374557404594267";

/* ================= DADOS ================= */

const ranking = new Map();
const cooldown = new Map();
const votosEnquete = new Map();

let eventoAtivo = false;
let msgEventoId = null;
let enqueteEnviada = false;
let ultimoInicio = null;

/* ================= BOTÕES EVENTO ================= */

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

/* ================= ENQUETE ================= */

function rowEnquete() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("enquete_01")
      .setLabel("01/05")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("enquete_02")
      .setLabel("02/05")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("enquete_03")
      .setLabel("03/05")
      .setStyle(ButtonStyle.Secondary)
  );
}

async function enviarEnquete(client) {
  if (enqueteEnviada) return;

  const canal = await client.channels.fetch(CANAL_EVENTO);

  const embed = new EmbedBuilder()
    .setColor("#a855f7")
    .setTitle("📊 ENQUETE OFICIAL DO EVENTO")
    .setDescription(
      "Escolha o melhor dia para o evento!\n\n" +
      "🗓️ 01/05\n🗓️ 02/05\n🗓️ 03/05\n\n" +
      "⚠️ Você só pode votar uma vez!"
    )
    .setFooter({ text: "Hospital Bella RP" });

  await canal.send({
    embeds: [embed],
    components: [rowEnquete()]
  });

  enqueteEnviada = true;
}

/* ================= COOLDOWN ================= */

function checkCooldown(id) {
  const now = Date.now();
  const last = cooldown.get(id) || 0;
  if (now - last < 5000) return true;
  cooldown.set(id, now);
  return false;
}

/* ================= LOG ================= */

async function log(client, texto) {
  try {
    const canal = await client.channels.fetch(CANAL_LOGS);
    await canal.send({
      embeds: [
        new EmbedBuilder()
          .setColor("#0ea5e9")
          .setTitle("📋 LOG DO EVENTO")
          .setDescription(texto)
          .setTimestamp()
      ]
    });
  } catch (e) {
    console.error("Erro log:", e);
  }
}

/* ================= UPDATE EVENTO ================= */

async function updateEvento(client) {
  if (!eventoAtivo) return;

  try {
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
      .setDescription(
        `🏆 **TOP 3**\n${lista}\n\n────────────────────────────\n⏰ 19:00 às 21:00`
      )
      .setTimestamp();

    if (msgEventoId) {
      const msg = await canal.messages.fetch(msgEventoId);
      await msg.edit({ embeds: [embed], components: [rowEvento()] });
    } else {
      const msg = await canal.send({
        embeds: [embed],
        components: [rowEvento()]
      });
      msgEventoId = msg.id;
    }
  } catch (e) {
    console.error("Erro updateEvento:", e);
  }
}

/* ================= FINALIZAR ================= */

async function finalizarEvento(client) {
  try {
    eventoAtivo = false;

    const canal = await client.channels.fetch(CANAL_EVENTO);
    const guild = canal.guild;

    const sorted = [...ranking.entries()].sort((a, b) => {
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
          .setTitle("🏆 RESULTADO FINAL")
          .setDescription(
            winners.map(([id, d], i) =>
              `#${i + 1} <@${id}> • 🩺 ${d.atendimento} | 📞 ${d.chamado}`
            ).join("\n")
          )
      ]
    });

    await log(client, "🏁 Evento finalizado e cargos entregues!");
    ranking.clear();
  } catch (e) {
    console.error("Erro finalizarEvento:", e);
  }
}

/* ================= AVISO ================= */

async function avisoEvento(client) {
  try {
    const canal = await client.channels.fetch(CANAL_EVENTO);

    await canal.send({
      embeds: [
        new EmbedBuilder()
          .setColor("#facc15")
          .setTitle("⚠️ EVENTO EM 20 MINUTOS")
          .setDescription("Preparem-se médicos!")
      ]
    });

    await log(client, "⚠️ Aviso enviado (20 minutos)");
  } catch (e) {
    console.error("Erro aviso:", e);
  }
}

/* ================= CLIENT ================= */

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* ================= READY ================= */

client.once("clientReady", () => {
  console.log("🔥 Bot online (versão final)");

  setInterval(() => {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();

    // 📊 ENQUETE ANTES DO EVENTO (18:20)
    if (h === 18 && m === 20 && !enqueteEnviada) {
      enviarEnquete(client);
    }

    if (h === 18 && m === 40) avisoEvento(client);

    if (h === 19 && m === 0 && ultimoInicio !== now.getDate()) {
      eventoAtivo = true;
      ultimoInicio = now.getDate();
      log(client, "🟢 Evento iniciado automaticamente!");
    }

    if (h === 21 && m === 0 && eventoAtivo) {
      finalizarEvento(client);
    }
  }, 60000);

  setInterval(() => updateEvento(client), 5000);
});

/* ================= INTERAÇÕES ================= */

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const id = interaction.user.id;
  const member = interaction.member;

  /* ================= ENQUETE ================= */
  if (interaction.customId.startsWith("enquete_")) {
    if (votosEnquete.has(id)) {
      return interaction.reply({
        content: "❌ Você já votou na enquete!",
        flags: MessageFlags.Ephemeral
      });
    }

    votosEnquete.set(id, interaction.customId);

    return interaction.reply({
      content: "✅ Voto registrado com sucesso!",
      flags: MessageFlags.Ephemeral
    });
  }

  /* ================= EVENTO ================= */

  if (!eventoAtivo) {
    return interaction.reply({
      content: "❌ Evento não está ativo",
      flags: MessageFlags.Ephemeral
    });
  }

  if (!member.roles.cache.has(CARGO_PARTICIPANTE)) {
    return interaction.reply({
      content: "❌ Apenas médicos podem participar!",
      flags: MessageFlags.Ephemeral
    });
  }

  if (checkCooldown(id)) {
    return interaction.reply({
      content: "⏳ Aguarde 5 segundos",
      flags: MessageFlags.Ephemeral
    });
  }

  if (!ranking.has(id)) {
    ranking.set(id, { atendimento: 0, chamado: 0 });
  }

  if (interaction.customId === "atendimento") {
    ranking.get(id).atendimento++;
    await log(interaction.client, `<@${id}> registrou ATENDIMENTO`);
  }

  if (interaction.customId === "chamado") {
    ranking.get(id).chamado++;
    await log(interaction.client, `<@${id}> registrou CHAMADO`);
  }

  return interaction.reply({
    content: "✅ Registrado!",
    flags: MessageFlags.Ephemeral
  });
});

/* ================= ERROS ================= */

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

/* ================= LOGIN ================= */

client.login(TOKEN).catch(console.error);
