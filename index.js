import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
  ChannelType
} from "discord.js";

// 🔐 CONFIG
const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1493948568078258347";
const GUILD_ID = "1477683902041690342";

// 🤖 BOT
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// =====================
// 📢 EVENTO
// =====================
function embedEvento() {
  return new EmbedBuilder()
    .setColor("#2ecc71")
    .setDescription(
`@|⚕️| Membro HP

🏥 **EVENTO HP — HOSPITAL BELLA**

📢 Sistema oficial de atendimentos e chamados em operação

📅 Data: 19/04/2026
⏰ Horário: 18:00 → 21:00

━━━━━━━━━━━━━━━━━━

🚑 **DESCRIÇÃO DO EVENTO**
O Hospital Bella está em operação ativa para simulação de atendimentos médicos em tempo real.

Avaliação:
• Atendimentos
• Chamados
• Tempo de resposta
• Eficiência

━━━━━━━━━━━━━━━━━━

🔴 **EVENTO FECHADO**

👥 Participantes: 4

━━━━━━━━━━━━━━━━━━

🏆 **PREMIAÇÃO**
🥇 1º → 100k
🥈 2º → 50k
🥉 3º → 35k`
    );
}

// =====================
// SLASH
// =====================
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("evento")
      .setDescription("Enviar evento HP")
      .addChannelOption(option =>
        option.setName("canal")
          .setDescription("Escolha o canal")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("✅ Comando registrado");
}

// =====================
// READY
// =====================
client.once("ready", async () => {
  console.log(`🤖 Online: ${client.user.tag}`);
  await registerCommands();
});

// =====================
// INTERAÇÃO
// =====================
client.on("interactionCreate", async (interaction) => {

  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "evento") {
    const canal = interaction.options.getChannel("canal");

    await canal.send({
      embeds: [embedEvento()]
    });

    return interaction.reply({
      content: "✅ Evento enviado com sucesso!",
      ephemeral: true
    });
  }
});

// =====================
client.login(TOKEN);
