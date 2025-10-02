// そんなこれskidしても意味ないよ笑
const x_super_properties = 'eyJvcyI6IldpbmRvd3MiLCJicm93c2VyIjoiQ2hyb21lIiwiZGV2aWNlIjoiIiwic3lzdGVtX2xvY2FsZSI6ImVuLVVTIiwiaGFzX2NsaWVudF9tb2RzIjpmYWxzZSwiYnJvd3Nlcl91c2VyX2FnZW50IjoiTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzEzNC4wLjAuMCBTYWZhcmkvNTM3LjM2IiwiYnJvd3Nlcl92ZXJzaW9uIjoiMTM0LjAuMC4wIiwib3NfdmVyc2lvbiI6IjEwIiwicmVmZXJyZXIiOiJodHRwczovL2Rpc2NvcmQuY29tIiwicmVmZXJyaW5nX2RvbWFpbiI6ImRpc2NvcmQuY29tIiwicmVmZXJyZXJfY3VycmVudCI6IiIsInJlZmVycmluZ19kb21haW5fY3VycmVudCI6IiIsInJlbGVhc2VfY2hhbm5lbCI6InN0YWJsZSIsImNsaWVudF9idWlsZF9udW1iZXIiOjM4NDg4NywiY2xpZW50X2V2ZW50X3NvdXJjZSI6bnVsbH0=';

const form = document.getElementById('messageForm');
const tokensInput = document.getElementById('tokens');
const channelIdInput = document.getElementById('channelId');
const sendIntervalInput = document.getElementById('sendInterval');
const messageInput = document.getElementById('message');
const forwardMessageUrlInput = document.getElementById('forwardMessageUrl');
const sendBtn = document.getElementById('sendBtn');
const stopBtn = document.getElementById('stopBtn');
const testBtn = document.getElementById('testBtn');
const statusDiv = document.getElementById('status');
const pollToggleHeader = document.getElementById('pollToggleHeader');
const pollToggle = document.getElementById('pollToggle');
const pollContent = document.getElementById('pollContent');
const pollQuestion = document.getElementById('pollQuestion');
const choicesContainer = document.getElementById('choicesContainer');
const addChoiceBtn = document.getElementById('addChoiceBtn');
const autoVoteChoiceInput = document.getElementById('autoVoteChoice');

let shouldStopSpam = false;
let totalSuccess = 0;
let totalFail = 0;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getAllTokens() {
    return tokensInput.value
        .split('\n')
        .map(token => token.trim())
        .filter(token => token.length > 0);
}

function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
}

stopBtn.addEventListener('click', () => {
    shouldStopSpam = true;
    showStatus('停止中...', 'error');
});

let pollEnabled = false;
pollToggleHeader.addEventListener('click', () => {
    pollEnabled = !pollEnabled;
    pollToggle.classList.toggle('active');
    pollContent.classList.toggle('active');
});

function addChoice(value = '') {
    if (choicesContainer.children.length >= 10) {
        showStatus('選択肢は最大10個までです', 'error');
        return;
    }

    const choiceItem = document.createElement('div');
    choiceItem.className = 'choice-item';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `選択肢 ${choicesContainer.children.length + 1}`;
    input.value = value;
    input.className = 'poll-choice';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-choice-btn';
    removeBtn.textContent = '削除';
    removeBtn.onclick = () => {
        choiceItem.remove();
        updateChoicePlaceholders();
    };

    choiceItem.appendChild(input);
    choiceItem.appendChild(removeBtn);
    choicesContainer.appendChild(choiceItem);
}

function updateChoicePlaceholders() {
    const choices = choicesContainer.querySelectorAll('.poll-choice');
    choices.forEach((input, index) => {
        input.placeholder = `選択肢 ${index + 1}`;
    });
}

addChoiceBtn.addEventListener('click', () => addChoice());
addChoice();

testBtn.addEventListener('click', async () => {
    const tokens = getAllTokens();
    const channelId = channelIdInput.value.trim();

    if (tokens.length === 0 || !channelId) {
        showStatus('TokenとChannel IDを入力してください', 'error');
        return;
    }

    testBtn.disabled = true;
    testBtn.textContent = 'テスト中...';

    try {
        const response = await fetch(`https://discord.com/api/v9/channels/${channelId}`, {
            headers: {
                'Authorization': tokens[0],
                'x-super-properties': x_super_properties
            },
            referrerPolicy: 'no-referrer'
        });

        if (response.ok) {
            const data = await response.json();
            showStatus(`接続成功: ${data.name || 'チャンネル確認OK'}`, 'success');
        } else {
            const error = await response.json();
            showStatus(`接続失敗: ${error.message} (code: ${error.code})`, 'error');
        }
    } catch (error) {
        showStatus(`エラー: ${error.message}`, 'error');
    } finally {
        testBtn.disabled = false;
        testBtn.textContent = 'チャンネル接続テスト';
    }
});

async function voteOnPoll(token, channelId, messageId, answerId, maxRetries = 3) {
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            const response = await fetch(`https://discord.com/api/v9/channels/${channelId}/polls/${messageId}/answers/@me`, {
                method: 'PUT',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json',
                    'x-super-properties': x_super_properties,
                    'Origin': 'https://discord.com',
                    'Referer': `https://discord.com/channels/@me/${channelId}`
                },
                body: JSON.stringify({
                    answer_ids: [answerId.toString()]
                })
            });

            if (response.ok || response.status === 204) {
                console.log(`${token.slice(0, 10)}***** - 投票成功`);
                return true;
            } else {
                console.error(`${token.slice(0, 10)}***** - 投票失敗(${response.status})`);
                return false;
            }
        } catch (error) {
            console.error(`${token.slice(0, 10)}***** - 投票エラー: ${error.message}`);
            retryCount++;
            await sleep(1000);
        }
    }
    return false;
}

async function sendMessageWithRetry(token, channelId, messageText, autoVoteChoice, maxRetries = 5, retryDelay = 3000) {
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            let body = { content: messageText };

            if (pollEnabled) {
                const question = pollQuestion.value.trim();
                const choices = Array.from(choicesContainer.querySelectorAll('.poll-choice'))
                    .map(input => input.value.trim())
                    .filter(choice => choice.length > 0);

                if (question && choices.length > 0) {
                    body.poll = {
                        question: { text: question },
                        answers: choices.map(choice => ({ poll_media: { text: choice } })),
                        duration: 1
                    };
                }
            }

            const response = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json',
                    'x-super-properties': x_super_properties,
                    'x-context-properties': btoa('{"location":"forwarding"}'),
                    'x-discord-locale': 'ja',
                    'x-discord-timezone': 'Asia/Tokyo',
                    'Origin': 'https://discord.com',
                    'Referer': `https://discord.com/channels/@me/${channelId}`
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                const messageData = await response.json();
                totalSuccess++;
                console.log(`${token.slice(0, 10)}***** - メッセージ送信成功`);
                showStatus(`送信中... (成功: ${totalSuccess}, レート制限: ${totalFail})`, 'success');

                // Auto vote if enabled and poll exists
                if (pollEnabled && autoVoteChoice > 0 && messageData.poll) {
                    const answerId = autoVoteChoice - 1;
                    if (answerId < messageData.poll.answers.length) {
                        await sleep(500);
                        await voteOnPoll(token, channelId, messageData.id, answerId);
                    }
                }

                return true;
            } else if (response.status === 429) {
                totalFail++;
                const error = await response.json();
                const waitTime = (error?.retry_after || 1) * 1000;
                console.warn(`${token.slice(0, 10)}***** - レート制限: ${waitTime / 1000}s`);
                showStatus(`レート制限 - ${waitTime / 1000}秒待機中... (成功: ${totalSuccess}, レート制限: ${totalFail})`, 'error');
                await sleep(waitTime);
            } else if (response.status === 400) {
                totalFail++;
                const error = await response.json();
                console.error(`${token.slice(0, 10)}***** - 送信エラー(${response.status}): ${JSON.stringify(error) || '詳細不明'}`);
                return false;
            } else {
                totalFail++;
                const error = await response.json();
                console.error(`${token.slice(0, 10)}***** - 送信エラー(${response.status}): ${JSON.stringify(error) || '詳細不明'}`);
                return false;
            }
        } catch (error) {
            console.error(`${token.slice(0, 10)}***** - エラー: ${error.message} | 再試行中...`);
            await sleep(retryDelay);
            retryCount++;
        }
    }

    console.error(`トークン(${token.slice(0, 10)}*****) 最大リトライ回数に達しました`);
    return false;
}

function parseMessageUrl(url) {
    // Parse Discord message URL: https://discord.com/channels/{guild_id}/{channel_id}/{message_id}
    const match = url.match(/discord\.com\/channels\/(\d+|@me)\/(\d+)\/(\d+)/);
    if (match) {
        return {
            guild_id: match[1] === '@me' ? null : match[1],
            channel_id: match[2],
            message_id: match[3]
        };
    }
    return null;
}

async function forwardMessageWithRetry(token, channelId, messageId, sourceChannelId, sourceGuildId, maxRetries = 5, retryDelay = 3000) {
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            const nonce = ((Date.now() - 1420070400000) * Math.pow(2, 22)).toString();

            const messageReference = {
                channel_id: sourceChannelId || channelId,
                message_id: messageId,
                type: 1
            };
            if (sourceGuildId) {
                messageReference.guild_id = sourceGuildId;
            }

            const body = {
                mobile_network_type: 'unknown',
                content: '',
                nonce: nonce,
                tts: false,
                message_reference: messageReference,
                flags: 0
            };

            const response = await fetch(`https://discord.com/api/v9/channels/${channelId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json',
                    'x-super-properties': x_super_properties,
                    'x-context-properties': btoa('{"location":"forwarding"}'),
                    'x-discord-locale': 'ja',
                    'x-discord-timezone': 'Asia/Tokyo',
                    'Origin': 'https://discord.com',
                    'Referer': `https://discord.com/channels/@me/${channelId}`
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                totalSuccess++;
                console.log(`${token.slice(0, 10)}***** - メッセージ転送成功`);
                showStatus(`送信中... (成功: ${totalSuccess}, レート制限: ${totalFail})`, 'success');
                return true;
            } else if (response.status === 429) {
                totalFail++;
                const error = await response.json();
                const waitTime = (error?.retry_after || 1) * 1000;
                console.warn(`${token.slice(0, 10)}***** - レート制限: ${waitTime / 1000}s`);
                showStatus(`レート制限 - ${waitTime / 1000}秒待機中... (成功: ${totalSuccess}, レート制限: ${totalFail})`, 'error');
                await sleep(waitTime);
            } else {
                totalFail++;
                const error = await response.json();
                console.error(`${token.slice(0, 10)}***** - 転送エラー(${response.status}): ${JSON.stringify(error) || '詳細不明'}`);
                return false;
            }
        } catch (error) {
            console.error(`${token.slice(0, 10)}***** - エラー: ${error.message} | 再試行中...`);
            await sleep(retryDelay);
            retryCount++;
        }
    }

    console.error(`トークン(${token.slice(0, 10)}*****) 最大リトライ回数に達しました`);
    return false;
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const messageText = messageInput.value.trim();
    const forwardMessageUrl = forwardMessageUrlInput.value.trim();

    let forwardInfo = null;
    if (forwardMessageUrl) {
        forwardInfo = parseMessageUrl(forwardMessageUrl);
        if (!forwardInfo) {
            showStatus('無効なメッセージURLです', 'error');
            return;
        }
    }

    if (!messageText && !forwardInfo) {
        showStatus('メッセージ内容または転送元メッセージURLを入力してください', 'error');
        return;
    }

    totalSuccess = 0;
    totalFail = 0;

    sendBtn.style.display = 'none';
    stopBtn.style.display = 'block';
    stopBtn.disabled = false;
    shouldStopSpam = false;

    const tokens = getAllTokens();
    const channelId = channelIdInput.value.trim();
    const interval = Math.max(parseInt(sendIntervalInput.value) || 500, 500);
    const autoVoteChoice = parseInt(autoVoteChoiceInput.value) || 0;

    const tasks = tokens.map(token => {
        return async () => {
            while (!shouldStopSpam) {
                let result;

                if (forwardInfo) {
                    result = await forwardMessageWithRetry(
                        token,
                        channelId,
                        forwardInfo.message_id,
                        forwardInfo.channel_id,
                        forwardInfo.guild_id
                    );
                    if (!result) break;
                    await sleep(interval);
                }

                if (messageText) {
                    result = await sendMessageWithRetry(token, channelId, messageText, autoVoteChoice);
                    if (!result) break;
                    await sleep(interval);
                }
            }
        };
    });

    await Promise.all(tasks.map(task => task()));

    sendBtn.style.display = 'block';
    stopBtn.style.display = 'none';
    showStatus(`停止しました - 合計: 成功 ${totalSuccess}件, レート制限 ${totalFail}件`, totalSuccess > 0 ? 'success' : 'error');
});

tokensInput.addEventListener('input', () => {
    localStorage.setItem('discord_tokens', tokensInput.value);
});

channelIdInput.addEventListener('input', () => {
    localStorage.setItem('discord_channel_id', channelIdInput.value);
});

window.addEventListener('load', () => {
    const savedTokens = localStorage.getItem('discord_tokens');
    const savedChannelId = localStorage.getItem('discord_channel_id');

    if (savedTokens) tokensInput.value = savedTokens;
    if (savedChannelId) channelIdInput.value = savedChannelId;
});
