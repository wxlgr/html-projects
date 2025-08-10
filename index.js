

let channels = []

let globalParsedChannels = [] // 全局解析后的频道列表
let groups = []
let lines = ""


let channelSoureces = [] // 频道来源
let selectedSources = [] // 选中的频道来源


const fileInput = document.getElementById('fileInput');
const inputTextarea = document.getElementById('inputTextarea');
const outputTextarea = document.getElementById('outputTextarea');
const resetbtn = document.getElementById('resetbtn');
const copybtn = document.getElementById('copybtn');
const downloadbtn = document.getElementById('downloadbtn');


const all = document.getElementById('all');
const allnot = document.getElementById('allnot');
const confirmBtn = document.getElementById('confirm');
const groupContainer = document.querySelector('.group');
const sourcesContainer = document.querySelector('.sourcesContainer');


// 自定义分类保留频道
const defaultGroupMaps = [
    { name: '4K 8K', keywords: ['4K', "8K"] },
    { name: '央视', keywords: ['央视', "CCTV", "C"] },
    { name: '卫视', keywords: ['卫视'] },
    { name: '少儿', keywords: ['少儿', "卡通", "动画", "动漫", "炫动"] },
    { name: '地方', keywords: ['地方'] },
    { name: '影视', keywords: ['影视', "熊猫", "CHC", "剧场", "影院"] },
    { name: '其他', keywords: [""] }
]

let groupMaps = [...JSON.parse(JSON.stringify(defaultGroupMaps))]; // 深拷贝默认分组规则
const mygroupNames = groupMaps.map(g => g.name);


// 默认不选中的源 因为可能暂时失效，比如bst
const defaultNotCheckSources = ['bst']


function renderGroupRules() {
    const ul = document.createElement('ul');
    const div = document.querySelector('.group-rules');

    const desc = document.createElement('div');
    desc.innerHTML = `<h2>分组规则</h2>
            <p>分组名称可以自定义，关键字按英文逗号分隔，将按关键字匹配频道到该分组。默认分组名称为：${defaultGroupMaps.map(g => g.name).join('、')}</p>`;

    const gbtns = document.createElement("div")
    gbtns.innerHTML = `<button class="addGroup">添加分组</button>
            <button class="resetGroup">重置分组</button>
            `

    div.innerHTML = ''; // 清空之前的内容
    div.appendChild(desc)
    div.appendChild(gbtns)

    groupMaps.slice().forEach((group, idx) => {

        // 创建分组列表项

        const li = document.createElement('li');
        li.innerHTML = `
                   <button class="deleteBtn">X</button><span>分组${idx + 1}:</span> <input type="text" class="group-name-input" data-idx="${idx}" value="${group.name}" />
                    <span><=关键字:</span><input type="text" class="group-keywords-input" data-idx="${idx}" value="${group?.keywords?.join(', ')}" />
                `;
        ul.appendChild(li);
    });
    div.appendChild(ul);

    document.querySelector('.addGroup').addEventListener('click', function () {
        if (groupMaps.length >= 8) {
            alert('最多只能添加8个分组');
            return;
        }
        const newIdx = groupMaps.length;
        const newGroup = { name: `分组${newIdx + 1}`, keywords: [] };
        groupMaps.push(newGroup);
        mygroupNames.push(newGroup.name);

        const li = document.createElement('li');
        li.innerHTML = `
                   <button class="deleteBtn">X</button><span>分组${newIdx + 1}:</span> <input type="text" class="group-name-input" data-idx="${newIdx}" value="${newGroup.name}" />
                    <span><=关键字:</span><input type="text" class="group-keywords-input" data-idx="${newIdx}" value="" />
                `;
        ul.appendChild(li);

        updateData();
        updateViews();
    });

    document.querySelector('.resetGroup').addEventListener('click', function () {

        if (confirm('确定要重置分组吗？这将删除所有自定义分组并恢复默认分组。')) {
            groupMaps.length = 0;
            mygroupNames.length = 0;

            defaultGroupMaps.forEach(g => {
                groupMaps.push(g);
                mygroupNames.push(g.name);
            });
            // 清空并重新渲染
            ul.innerHTML = '';
            groupMaps.slice().forEach((group, idx) => {
                const li = document.createElement('li');
                li.innerHTML = `
                           <button class="deleteBtn">X</button><span>分组${idx + 1}:</span> <input type="text" class="group-name-input" data-idx="${idx}" value="${group.name}" />
                            <span><=关键字:</span><input type="text" class="group-keywords-input" data-idx="${idx}" value="${group.keywords.join(', ')}" />
                        `;
                ul.appendChild(li);
            });
            updateData();
            updateViews();
        }
    });
    // 事件委托，监听删除按钮点击
    ul.addEventListener('click', function (e) {
        if (e.target.classList.contains('deleteBtn')) {
            const li = e.target.closest('li');
            const idx = Array.from(ul.children).indexOf(li);
            if (idx > -1) {
                groupMaps.splice(idx, 1);
                mygroupNames.splice(idx, 1);
                ul.removeChild(li);
                // 更新剩余输入框的 data-idx 属性
                Array.from(ul.children).forEach((child, newIdx) => {
                    const nameInput = child.querySelector('.group-name-input');
                    const keywordsInput = child.querySelector('.group-keywords-input');
                    nameInput.setAttribute('data-idx', newIdx);
                    keywordsInput.setAttribute('data-idx', newIdx);
                    child.querySelector('span').textContent = `分组${newIdx + 1}:`;
                });
            }
            updateData();
            updateViews();
        }
    });

    // 事件委托，监听
    ul.addEventListener('change', function (e) {
        if (e.target.classList.contains('group-name-input')) {
            const idx = e.target.getAttribute('data-idx');
            groupMaps[idx].name = e.target.value.trim();
            mygroupNames[idx] = e.target.value.trim();
        }
        if (e.target.classList.contains('group-keywords-input')) {
            const idx = e.target.getAttribute('data-idx');
            groupMaps[idx].keywords = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
        }

        console.log('Updated groupMaps:', groupMaps);


        // 刷新数据 更新视图
        updateData();
        updateViews();

    });
}


init()


function extractSource(url) {
    try {
        const path = new URL(url).pathname; // 获取路径部分
        const segments = path.split('/').filter(Boolean); // 分割路径并过滤空值
        return segments[0]; // 返回第一个路径段
    } catch (e) {
        return null;
    }
}


// 去除name杂项
function processName(name = "") {

    name = name.toLocaleUpperCase().trim()
    const originName = name
    let index = name.lastIndexOf("-")
    if (index > 0) {
        name = name.slice(0, index)

    }
    name = name.replace(/超清|高清|超高清|HD|\..+/ig, "")

    // console.log("processName:", originName, "=>", name)

    return name
}


/**
 * 将 M3U 格式的字符串解析为频道对象数组
 * @param {string} m3uString - M3U 格式的字符串
 * @returns {Array} 解析后的频道对象数组
 */
function parseM3UToChannels(m3uString = "") {
    if (!m3uString || typeof m3uString !== "string") return [];
    const lines = m3uString
        .trim()
        .split('\n')
        .map(line => line.trim());

    let currentChannel = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith('#EXTINF:')) {
            // 提取频道信息
            const extinfLine = line;
            const groupMatch = extinfLine.match(/group-title="([^"]*)"/); // 匹配分组
            const logoMatch = extinfLine.match(/tvg-logo="([^"]*)"/);     // 匹配Logo


            const name = extinfLine.slice(extinfLine.lastIndexOf(",") + 1)

            currentChannel = {
                name: name,
                group: (groupMatch && groupMatch[1]) || '',
                logo: (logoMatch && logoMatch[1]) || ''
            };
        } else if (currentChannel && line.startsWith('http')) {
            // 下一行是流地址
            currentChannel.url = line;
            currentChannel.source = extractSource(line) ?? ''
            channels.push(currentChannel);
            currentChannel = null;
        }
    }

    // 过滤无效mgtv 和yhyx  咪咕、测试频道
    channels = channels.filter(channel => {

        const filters = ["mgtv", "yhyx", "测试", "咪咕", "nptv"]
        return !filters.some(item => channel.name.includes(item) || channel.source.includes(item))
    })

    // 处理 频道名称杂项
    channels.forEach(c => c.name = processName(c.name))
    return channels;
}


async function init() {
    resetData();
    renderDescription()
    renderGroupRules();
    initEvents();
}

function updateData() {
    if (!globalParsedChannels || globalParsedChannels.length === 0) {
        return
    }

    channels = globalParsedChannels.filter(channel => selectedSources.includes(channel.source));
    console.log("channels after filter length:", channels.length, "selectedSources:", selectedSources)
    initGroups(channels);
}
function resetData() {
    inputTextarea.value = '';
    outputTextarea.value = '';
    fileInput.value = '';
    inputTextarea.placeholder = '请上传m3u文件或粘贴内容';
    lines = "";
    groups = [];
    channels = [];
    channelSoureces = []; // 重置频道来源
    selectedSources = []; // 重置选中的来源
    groupMaps = [...JSON.parse(JSON.stringify(defaultGroupMaps))]; // 重置分组规则


}





function initGroups(channels) {
    if (channels?.length == 0 || mygroupNames?.length == 0) {
        console.log(channels, mygroupNames, "channels or mygroupNames is empty,return initGroups")
        groups = [];
        return;
    }

    console.log("initGroups channels.length:", channels.length, "mygroupNames.length:", mygroupNames.length)


    groups = mygroupNames.map(name => {
        return {
            name,
            isChecked: true, // 默认勾选
        };
    })
    console.log("groups.length", groups.length);
    // console.table(JSON.parse(JSON.stringify(groups)));


    let count = 0;
    channels.forEach(channel => {
        const groupName = channel.group?.toString().toLocaleUpperCase() || '';
        const channelName = channel.name?.toString().toLocaleUpperCase() || '';
        // 根据 channel.group 或 channel.name 是否包含 keywords 中的关键词，来为频道匹配一个分组。
        // console.log("channelName", channelName,"groupName",groupName)
        const matchGroup = groupMaps.find(m => {
            return m.keywords.some(keyword => {
                if (channelName.includes(keyword)) {
                    // console.log(`${channelName}.includes${keyword}`, channelName.includes(keyword))
                    return true
                }
                else {
                    // console.log(`${groupName}.includes${keyword}`, groupName.includes(keyword))
                    return groupName.includes(keyword)
                }
            })
        })

        if (matchGroup) {
            count += 1;
            // console.log('matchGroup:', matchGroup, 'channel.group:', channel.group);
            // console.log(channel.name, channel.group, '->', matchGroup.name);
            channel.group = matchGroup.name; // 更新分组名称
        }
    })


    console.log('已匹配重置频道分类 count:', count, 'channels.length:', channels.length);


    channels.sort(function (a, b) {
        return b.group.localeCompare(a.group);
    })


    // console.table(JSON.parse(JSON.stringify(channels)));

    groups = groups.map(g => {

        let currentGroupChannels = channels.filter(c => c.group == g.name)
        currentGroupChannels = currentGroupChannels.map(c => {
            // 规范央视
            if (c.name.startsWith("CCTV") && c.group == "央视") {
                const targetName = normalizeCCTV(c.name)
                // console.log("normalizeCCTV:", c.name + " --> " + targetName)
                c.name = normalizeCCTV(c.name)
            }
            return c
        })
        // 排序
        currentGroupChannels.sort((a, b) => {
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();


            const numA = extractChannelNumber(nameA);
            const numB = extractChannelNumber(nameB);

            const isDigitA = numA !== null;
            const isDigitB = numB !== null;

            const isA_1_9 = isDigitA && numA >= 1 && numA <= 9;
            const isB_1_9 = isDigitB && numB >= 1 && numB <= 9;

            const isA_10_plus = isDigitA && numA > 9;
            const isB_10_plus = isDigitB && numB > 9;



            // 1. 先排 1~9
            if (isA_1_9 && !isB_1_9) return -1;
            if (!isA_1_9 && isB_1_9) return 1;

            // 2. 再排 10+
            if (isA_10_plus && !isB_10_plus) return -1;
            if (!isA_10_plus && isB_10_plus) return 1;

            // 3. 最后排非数字频道
            if (!isDigitA && isDigitB) return 1;
            if (isDigitA && !isDigitB) return -1;

            // 4. 同类情况下按数字排序
            if (numA !== null && numB !== null) {
                return numA - numB;
            }

            // 5. 非数字频道按字母排序
            return nameA.localeCompare(nameB);
        });

        // console.log("sorted channels:", currentGroupChannels)


        let currentChannelNames = [...new Set(currentGroupChannels.map(channel => channel.name))];
        // console.log('当前分组下的频道名称：', currentChannelNames)



        // 已排序
        let res = currentChannelNames.map(channel => {

            let currentChannelUrls = currentGroupChannels.filter(item => item.name === channel).map(item => item.url).sort((a, b) => {

                // 排序优先规则：bst → gptv
                // const order = [ 'bst', 'gptv'];
                const order = ['gptv', "bst", "migu"];

                const sourceA = getSourceFromUrl(a)
                const sourceB = getSourceFromUrl(b)
                const indexA = order.indexOf(sourceA);
                const indexB = order.indexOf(sourceB);
                const rankA = indexA === -1 ? order.length : indexA;
                const rankB = indexB === -1 ? order.length : indexB;
                return rankA - rankB;
            })

            return {
                name: channel,
                logo: currentGroupChannels.find(channelItem => channelItem.name === channel).logo,
                urls: currentChannelUrls,
            }
        })


        // 获取分组的频道
        const finalRes = []
        for (let i = 0; i < res.length; i++) {
            const channel = res[i];
            for (let j = 0; j < channel.urls.length; j++) {
                const url = channel.urls[j];
                finalRes.push({
                    name: channel.name,
                    logo: channel.logo,
                    url,
                    group: g.name
                })
            }
        }
        return {
            ...g,
            channels: finalRes
        }
    })


}

function getSourceFromUrl(url) {
    const match = url.match(/\/\/[^/]+\/([^/]+)/);
    return match ? match[1] : 'unknown';
}
function extractChannelNumber(name) {
    const match = name.match(/cctv-(\d+)/i);
    return match ? parseInt(match[1], 10) : null;
}
const cctvMap = {
    // 数字 → 名称
    '1': '综合',
    '2': '财经',
    '3': '综艺',
    '4': '中文国际',
    '5': '体育',
    '5+': '体育赛事',
    '6': '电影',
    '7': '国防军事',
    '8': '电视剧',
    '9': '纪录片',
    '10': '科教',
    '11': '戏曲',
    '12': '社会与法',
    '13': '新闻',
    '14': '少儿',
    '15': '音乐',
    '16': '奥林匹克',
    '17': '农业农村',
    '4K': '4K',
    '8K': '8K',
};


function normalizeCCTV(channelName) {
    if (typeof channelName !== 'string') return channelName;

    const original = channelName;
    const lowerName = channelName.toLowerCase().trim();

    // 优先处理 5+
    if (/cctv[\s\-]*5\+/i.test(lowerName)) {
        return `CCTV-5+ ${cctvMap['5+']}`;
    }

    // 匹配数字格式：CCTV1、CCTV-2、CCTV 5 等
    const numMatch = lowerName.match(/cctv[\s\-]*(\d+)/i);
    if (numMatch) {
        const num = numMatch[1];
        const name = cctvMap[num];
        if (name) return `CCTV-${num} ${name}`;
    }
    return original;
}

function updateViews() {
    console.log("updateViews channels length:", channels.length, "groups length:", groups.length, "selectedSources:", selectedSources)

    renderSources();
    renderGroupRules();
    rendergroupContainer();
}

function initEvents() {

    resetbtn.addEventListener('click', (e) => {
        e.preventDefault();
        resetData();
        updateViews()
    });

    copybtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!outputTextarea.value) {
            alert('没有可复制的内容');
            return;
        }
        outputTextarea.select();
        document.execCommand('copy');
        alert('已复制自定义后数据到剪贴板');
    });
    downloadbtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!outputTextarea.value) {
            alert('没有可下载的内容');
            return;
        }
        const blob = new Blob([outputTextarea.value], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'feiyang.m3u';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    fileInput.addEventListener("change", function () {
        const file = this.files[0];
        inputTextarea.value = ""

        if (file) {
            const allowedExtensions = /(\.txt|\.m3u)$/i;
            if (!allowedExtensions.test(file.name)) {
                alert("错误：只允许选择 .txt 或 .m3u 文件！");
                this.value = ""; // 清空选择
                return;
            }
            const reader = new FileReader();
            reader.onload = function (e) {
                // 读取完成后，将内容放入 textarea
                inputTextarea.value = reader.result;
                inputTextarea.dispatchEvent(new Event('change')); // 手动触发 change 事件
            };

            reader.onerror = function () {
                console.log('Error reading file:', reader.error);
            };
            reader.readAsText(file); // 以文本方式读取文件
        }
    });

    inputTextarea.addEventListener('change', (e) => {
        if (!inputTextarea.value) {
            console.log('inputTextarea 没有内容');
            return;
        }
        // console.log('inputTextarea 有内容，开始解析 M3U');
        lines = inputTextarea.value
        globalParsedChannels = parseM3UToChannels(lines);

        channelSoureces = [...new Set(globalParsedChannels.map(c => c.source))]
        // 初始化选中的来源
        selectedSources = channelSoureces.filter(source => !defaultNotCheckSources.includes(source)); // 默认选中除contCheckSources外的所有来源
        updateData(); // 更新数据
        updateViews();
    });


    all.addEventListener('click', (e) => {
        e.preventDefault();
        groups.forEach(group => group.isChecked = true);

        updateViews();
    });
    allnot.addEventListener('click', (e) => {
        e.preventDefault();
        groups.forEach(group => group.isChecked = false);
        updateViews();
    });

    confirmBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!inputTextarea.value) {
            alert('没有内容');
            return;
        }

        document.querySelectorAll('.group input[type="checkbox"][name="group"]').forEach(checkbox => {
            const groupName = checkbox.value;

            groups.find(group => group.name === groupName).isChecked = checkbox.checked;

        });
        console.log('confirm groups', groups);

        const selectedGroups = groups.filter(group => group.isChecked);
        console.log('confirm selectedGroups', selectedGroups);

        if (selectedGroups.length === 0) {
            alert('请至少选择一个分组');
            return;
        }
        // const selectedChannels = .filter(channel => selectedGroups.some(group => group.name === channel.group));
        const selectedChannels = selectedGroups.reduce((acc, group) => {
            acc.push(...group.channels);
            return acc;
        }, []);




        generateM3UContent(selectedChannels).then(m3uContent => {
            outputTextarea.value = m3uContent ?? "";
        });

    });

}

async function generateM3UContent(selectedChannels) {

    const header = '#EXTM3U x-tvg-url="https://11.112114.xyz/fy.xml"\n\n';
    const infos = selectedChannels.map(channel => {
        return `#EXTINF:-1 tvg-logo="${channel.logo}" group-title="${channel.group}", ${channel.name}\n${channel.url}\n`;
    }).join('\n') + '\n';
    return header + infos;
}

function renderSources() {

    if (!channelSoureces || channelSoureces.length === 0) {
          sourcesContainer.innerHTML = ''; // 清空之前的内容
        return;
    }
    sourcesContainer.innerHTML = ''; // 清空之前的内容

    const h2 = document.createElement('h2')
    h2.innerText = '频道来源过滤';
    sourcesContainer.appendChild(h2)

    const div = document.createElement('div')
    div.className = 'sources'

    channelSoureces.forEach(source => {
        const label = document.createElement('label');
        label.innerHTML = `<input ${selectedSources.includes(source) ? 'checked' : ''} type="checkbox" name="source" value="${source}">${source}`;
        div.appendChild(label);
    });

    sourcesContainer.appendChild(div);




    div.addEventListener('change', (e) => {
        e.preventDefault();
        const checkboxes = div.querySelectorAll('input[type="checkbox"][name="source"]');

        const res = Array.from(checkboxes)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.value);

        // 更新选中的来源
        selectedSources = res;

        console.log("Selected sources:", selectedSources);
        updateData();
        updateViews();



    })
}
function rendergroupContainer() {
    groupContainer.innerHTML = '';



    groups.forEach(group => {
        const channelNum = group.channels?.length || 0

        const label = document.createElement('label');
        label.innerHTML = `<input ${group.isChecked && channelNum > 0 ? 'checked' : ''} type="checkbox" name="group" value="${group.name}">${group.name}
         <span style="color:red">${channelNum}个</span>`;
        groupContainer.appendChild(label);
    });
}
function renderDescription() {
    const descList = [
        '上传或粘贴 M3U 文件，自动解析频道信息',
        '自动去除yhyx、mgtv、测试等无效频道',
        '支持自定义频道来源过滤',
        '支持自定义分组名称和关键字',
        '合并频道并规范化央视频道',
        '央视排序默认优选级gptv > bst > migu',
        '可勾选需要保存的分组, 点击确认生成m3u',
        '响应式布局，适配 PC / 平板 / 手机'
    ]
    const description = document.querySelector('ul.description');
    description.innerHTML = '';
    descList.forEach((desc, index) => {
        const li = document.createElement('li');
        li.innerHTML = `${index + 1} 、 ${desc}`;
        description.appendChild(li);
    });
}



