require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    EmbedBuilder
} = require('discord.js');

const CLIENT_ID = '1556192655233384458';
const GUILD_ID = '1550531401965899829';

let participants = [];

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const commands = [
    new SlashCommandBuilder()
        .setName('팀나누기')
        .setDescription('새로운 내전 팀을 만듭니다.')
        .toJSON()
];

const rest = new REST({ version: '10' })
    .setToken(process.env.DISCORD_TOKEN);


// 봇 로그인
client.once('ready', async () => {

    console.log(`봇 로그인 완료! ${client.user.tag}`);

    try {

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );

        console.log('슬래시 명령어 등록 완료!');

    } catch (error) {

        console.error(error);

    }
});


// 명령어와 버튼 처리
client.on('interactionCreate', async interaction => {


    // /팀나누기
    if (interaction.isChatInputCommand()) {

        if (interaction.commandName === '팀나누기') {

            participants = [];

            await interaction.reply({
                embeds: [createLobbyEmbed()],
                components: [createButtons()]
            });

        }

        return;
    }


    // 버튼
    if (interaction.isButton()) {


        // 참가하기
        if (interaction.customId === '참가하기') {

            const alreadyJoined = participants.some(
                user => user.id === interaction.user.id
            );

            if (alreadyJoined) {

                await interaction.reply({
                    content: '⚠️ 이미 참가한 상태야!',
                    ephemeral: true
                });

                return;
            }


            const member = await interaction.guild.members.fetch(
                interaction.user.id
            );

            const nickname =
                member.nickname ||
                interaction.user.globalName ||
                interaction.user.username;


            participants.push({
                id: interaction.user.id,
                nickname: nickname
            });


            await interaction.update({
                embeds: [createLobbyEmbed()],
                components: [createButtons()]
            });

            return;
        }


        // 나가기
        if (interaction.customId === '나가기') {

            const beforeCount = participants.length;

            participants = participants.filter(
                user => user.id !== interaction.user.id
            );


            if (participants.length === beforeCount) {

                await interaction.reply({
                    content: '⚠️ 현재 참가 명단에 없어!',
                    ephemeral: true
                });

                return;
            }


            await interaction.update({
                embeds: [createLobbyEmbed()],
                components: [createButtons()]
            });

            return;
        }


        // 팀 나누기
        if (interaction.customId === '팀나누기') {

            if (participants.length < 2) {

                await interaction.reply({
                    content: '⚠️ 최소 2명이 있어야 팀을 나눌 수 있어!',
                    ephemeral: true
                });

                return;
            }


            const teams = makeTeams();


            await interaction.update({
                embeds: [createTeamEmbed(teams)],
                components: [createTeamButtons()]
            });

            return;
        }


        // 재추첨
        if (interaction.customId === '재추첨') {

            if (participants.length < 2) {

                await interaction.reply({
                    content: '⚠️ 최소 2명이 있어야 팀을 나눌 수 있어!',
                    ephemeral: true
                });

                return;
            }


            const teams = makeTeams();


            await interaction.update({
                embeds: [createTeamEmbed(teams)],
                components: [createTeamButtons()]
            });

            return;
        }


        // 내전 종료
        if (interaction.customId === '내전종료') {

            participants = [];


            await interaction.update({
                embeds: [createEndEmbed()],
                components: []
            });

            return;
        }
    }
});


// 참가자 목록
function createLobbyEmbed() {

    let participantText;


    if (participants.length === 0) {

        participantText =
            '아직 참가자가 없습니다.\n' +
            '아래 버튼을 눌러 참가해주세요.';

    } else {

        participantText = participants
            .map(
                (user, index) =>
                    `**${index + 1}.** ${user.nickname}`
            )
            .join('\n');
    }


    return new EmbedBuilder()
        .setTitle('🎮 내전 팀 나누기')
        .setDescription(
            '친구들과 함께할 내전 참가자를 모집합니다.'
        )
        .addFields({
            name: `👥 참가자 ${participants.length}명`,
            value: participantText
        })
        .setFooter({
            text: '참가하기 → 팀 나누기 → 내전 시작!'
        });
}


// 팀 결과
function createTeamEmbed(teams) {

    const teamAText = teams.teamA
        .map(user => `👤 ${user.nickname}`)
        .join('\n');

    const teamBText = teams.teamB
        .map(user => `👤 ${user.nickname}`)
        .join('\n');


    return new EmbedBuilder()
        .setTitle('🏆 랜덤 팀 배정 완료!')
        .setDescription(
            '🎲 참가자들을 랜덤으로 배정했습니다.'
        )
        .addFields(
            {
                name: `🔵 A TEAM · ${teams.teamA.length}명`,
                value: teamAText
            },
            {
                name: `🔴 B TEAM · ${teams.teamB.length}명`,
                value: teamBText
            }
        )
        .setFooter({
            text: '마음에 들지 않으면 🔄 재추첨!'
        });
}


// 내전 종료
function createEndEmbed() {

    return new EmbedBuilder()
        .setTitle('🏁 내전 종료')
        .setDescription(
            '이번 내전이 종료되었습니다.\n\n' +
            '👥 참가자 명단이 초기화되었습니다.\n\n' +
            '`/팀나누기`를 입력하면 새로운 내전을 시작할 수 있습니다.'
        )
        .setFooter({
            text: '다음 내전을 기다리는 중...'
        });
}


// 랜덤 팀 만들기
function makeTeams() {

    const shuffled = [...participants];


    for (let i = shuffled.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [shuffled[i], shuffled[j]] =
            [shuffled[j], shuffled[i]];
    }


    const middle = Math.ceil(shuffled.length / 2);

    const teamA = shuffled.slice(0, middle);
    const teamB = shuffled.slice(middle);


    return {
        teamA,
        teamB
    };
}


// 참가 버튼
function createButtons() {

    return new ActionRowBuilder()
        .addComponents(

            new ButtonBuilder()
                .setCustomId('참가하기')
                .setLabel('참가하기')
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId('나가기')
                .setLabel('나가기')
                .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
                .setCustomId('팀나누기')
                .setLabel('🎲 팀 나누기')
                .setStyle(ButtonStyle.Primary)

        );
}


// 팀 결과 버튼
function createTeamButtons() {

    return new ActionRowBuilder()
        .addComponents(

            new ButtonBuilder()
                .setCustomId('재추첨')
                .setLabel('🔄 재추첨')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('내전종료')
                .setLabel('🧹 내전 종료')
                .setStyle(ButtonStyle.Danger)

        );
}


// 봇 실행
client.login(process.env.DISCORD_TOKEN);