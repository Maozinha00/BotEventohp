import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

// 🔐 CONFIG
const TOKEN = process.env.TOKEN;

// 👮 CARGOS
const CARGO_SERVICO_ID = "1492553421973356795";
const CARGO_PING = "1477683902079303932";

// 🏆 TOP 3 CARGOS
const CARGO_1 = "1477683902100410424";
const CARGO_2 = "1495374426815074304";
const CARGO_3 = "1495374557404594267";

// 📌 CANAIS
const CANAL_PAINEL_ID = "1477683908026961940";
const CANAL_LOGS_ID = "1495370353193521182";
const CANAL_AVISO_ID = "1477683904315134215";

// ⏰ EVENTO
const EVENTO_INICIO = new Date("2026-04-19T18:00:00-03:00");
const EVENTO_FIM = new Date("2026-04-19T21:00:00-03:00");

// 📊 DB
const db = { users: {} };

function getUser(id) {
  if (!db.users[id]) {
    db.users[id] = { atendimentos: 0, chamados: 0, pontos: 0 };
  }
  return db.users[id];
}

// ⏰ STATUS
function eventoAtivo() {
  const now = Date.now();
  return now >= EVENTO_INICIO.getTime() && now <= EVENTO_FIM.getTime();
}

// 🚫 COOLDOWN
const cooldown = new Map();
const COOLDOWN_TIME = 5000;

function podeClicar(id) {
  const now = Date.now();
  const last = cooldown.get(id);

  if (last && now - last < COOLDOWN_TIME) return false;

  cooldown.set(id, now);
  return true;
}

// 🤖 BOT
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

let painelMsgId = null;
let avisoEnviado = false;
let finalizado = false;

// 🔘 BOTÕES
function botoes() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("atendimento")
      .setLabel("🏥 Atendimento")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("chamado")
      .setLabel("📞 Chamado")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("ranking")
      .setLabel("🏆 Ranking")
      .setStyle(ButtonStyle.Danger)
  );
}

// 📊 LOG
async function logEvento(userId, tipo, pontos) {
  try {
    const canal = await client.channels.fetch(CANAL_LOGS_ID);

    const embed = new EmbedBuilder()
      .setColor("#2f3136")
      .setTitle("📊 LOG HOSPITAL BELLA")
      .setDescription(
        `👤 <@${userId}>
📌 ${tipo}
⭐ +${pontos} pontos
⏰ ${new Date().toLocaleTimeString("pt-BR")}`
      );

    await canal.send({ embeds: [embed] });
  } catch {}
}

// 🔔 AVISO
async function avisoAntesAbrir() {
  try {
    const canal = await client.channels.fetch(CANAL_AVISO_ID);

    await canal.send(
`<@&${CARGO_PING}> 🔔 COMUNICADO INTERNO — HOSPITAL BELLA

🏥 O plantão iniciará em 10 minutos.

⏰ Início: 18:00

Por favor, se organizem.

— Coordenação Hospital Bella`
    );
  } catch {}
}

// 🏆 RANKING
function gerarRanking() {
  const ranking = Object.entries(db.users)
    .sort((a, b) => b[1].pontos - a[1].pontos)
    .slice(0, 3);

  let text = "";

  ranking.forEach(([id, d], i) => {
    const medalha = i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉";
    text += `${medalha} <@${id}> — ${d.pontos} pts\n`;
  });

  return new EmbedBuilder()
    .setColor("#FFD700")
    .setTitle("🏆 RANKING HOSPITAL BELLA")
    .setDescription(text || "Sem dados");
}

// 📢 PAINEL
async function atualizarPainel() {
  const canal = await client.channels.fetch(CANAL_PAINEL_ID);

  const embed = new EmbedBuilder()
    .setColor(eventoAtivo() ? "#00ff00" : "#ff0000")
    .setDescription(
`<@&${CARGO_PING}>

🏥 **EVENTO HP — HOSPITAL BELLA**

📅 19/04/2026  
⏰ 18:00 → 21:00  

━━━━━━━━━━━━━━━

🚑 Sistema de atendimento ativo

📊 Avaliação:
• Atendimentos
• Chamados
• Eficiência

━━━━━━━━━━━━━━━

${eventoAtivo() ? "🟢 EVENTO ATIVO" : "🔴 EVENTO FECHADO"}

👥 Participantes: ${Object.keys(db.users).length}

━━━━━━━━━━━━━━━

🏆 PREMIAÇÃO
🥇 1º → 100k  
🥈 2º → 50k  
🥉 3º → 35k`
    );

  if (painelMsgId) {
    const msg = await canal.messages.fetch(painelMsgId);
    await msg.edit({ embeds: [embed], components: [botoes()] });
  } else {
    const msg = await canal.send({ embeds: [embed], components: [botoes()] });
    painelMsgId = msg.id;
  }
}

// 🏁 FINALIZAR
async function finalizarEvento() {
  if (finalizado) return;
  finalizado = true;

  const guild = client.guilds.cache.first();

  const ranking = Object.entries(db.users)
    .sort((a, b) => b[1].pontos - a[1].pontos)
    .slice(0, 3);

  for (let i = 0; i < ranking.length; i++) {
    const [id] = ranking[i];

    const member = await guild.members.fetch(id).catch(() => null);
    if (!member) continue;

    const cargo =
      i === 0 ? CARGO_1 :
      i === 1 ? CARGO_2 :
      CARGO_3;

    await member.roles.add(cargo);
  }
}

// 🔥 LOOP
setInterval(async () => {
  const now = Date.now();

  const diff = EVENTO_INICIO.getTime() - now;

  if (diff <= 10 * 60 * 1000 && diff > 9 * 60 * 1000 && !avisoEnviado) {
    await avisoAntesAbrir();
    avisoEnviado = true;
  }

  try {
    await atualizarPainel();
  } catch {}

  if (now > EVENTO_FIM.getTime() && !finalizado) {
    await finalizarEvento();
  }
}, 5000);

// 🚀 READY
client.once("ready", async () => {
  console.log(`✅ Online: ${client.user.tag}`);
  await atualizarPainel();
});

client.login(TOKEN);
