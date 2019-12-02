import { RandomPickCommit, RandomPickSafe, RandomPickerPre, RandomPickerPost } from './RandomPicker';

const _prop = PropertiesService.getScriptProperties();
const SLACK_WEBHOOK = _prop.getProperty('SLACK_WEBHOOK');
const SLACK_CHANNEL = _prop.getProperty('SLACK_CHANNEL');
const YAHOO_API = _prop.getProperty('YAHOO_API');
const SHEET_ID = _prop.getProperty('SHEET_ID');

const EMOJI_ICON = ':rice_ball:';
const BOT_NAME = 'ごはんbotV2';
const LUNCH_HOUR = 12;
const LUNCH_MINUTE = 25;



function get_weather() {
    const request = UrlFetchApp.fetch(YAHOO_API);
    const data = JSON.parse(request.getContentText());
    return data;
}

function get_rain(): string {
    const weatherData = get_weather();
    const rain = JSON.parse(
        weatherData.Feature[0].Property.WeatherList.Weather[0].Rainfall
    ); // observationのrainfallを取る
    if (rain < 0.1) {
        return 'no';
    } else if (rain < 1.0) {
        return 'weak';
    } else if (rain >= 1.0) {
        return 'strong';
    }
    return 'no';
}

// slackからガチャを回す用
function do_get(e): any {
    main();
    const response = HtmlService.createHtmlOutput();
    return response;
}

// 分指定でトリガー出来ないので、一旦ここでトリガーをセット
// cf. https://qiita.com/sumi-engraphia/items/465dd027e17f44da4d6a
function set_trigger() {
    const triggerDay = new Date();
    if (is_businessday(triggerDay)) {
        triggerDay.setHours(LUNCH_HOUR);
        triggerDay.setMinutes(LUNCH_MINUTE);
        ScriptApp.newTrigger('main')
            .timeBased()
            .at(triggerDay)
            .create();
    }
}

function is_businessday(date: Date): boolean {
    if (date.getDay() === 0 || date.getDay() === 6) {
        return false;
    }
    const calJa = CalendarApp.getCalendarById(
        'ja.japanese#holiday@group.v.calendar.google.com'
    );
    if (calJa.getEventsForDay(date).length > 0) {
        return false;
    }
    return true;
}

const deleteTrigger = () => {
    const triggers = ScriptApp.getProjectTriggers();
    for (const tri of triggers) {
        // for (let i = 0; i < triggers.length; i++) {
        if (tri.getHandlerFunction() === 'choice') {
            ScriptApp.deleteTrigger(tri);
        }
    }
}

function random_array<T>(arr: Array<T>): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function post_message(message: string, hookPoint: string) {
    const payload = {
        text: message,
        icon_emoji: EMOJI_ICON,
        username: BOT_NAME,
        channel: SLACK_CHANNEL
    };
    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        method: 'post',
        payload: JSON.stringify(payload),
        headers: {
            'Content-type': 'application/json'
        }
    };
    const response = UrlFetchApp.fetch(hookPoint, options);

    if (response.getResponseCode() === 200) {
        return response;
    }

    Logger.log(response);
    return false;
}

function get_category(category, weather) {
    const RAIN_CATEGORY = 4;
    if (weather == 'weak') {
        if (category > 1) {
            return RAIN_CATEGORY;
        }
    } else if (weather == 'strong') {
        return RAIN_CATEGORY;
    }
    return category;
}

function main() {
    deleteTrigger();

    const category_mark = {
        1: ':one:',
        2: ':two:',
        3: ':three:',
        4: ':rain:'
    };

    const sp = SpreadsheetApp.openById(SHEET_ID);
    var sheet = sp.getSheetByName('シート1');

    var rain = get_rain();

    RandomPickerPre();
    var rows = [];
    for (var i = 0; i < 3; i++) {
        var ctgy = get_category(i + 1, rain);
        while (true) {
            var r = RandomPickSafe(ctgy);
            var val = r[1][0];
            if (!rows.includes(val)) {
                rows.push(category_mark[ctgy] + ' ' + val);
                RandomPickCommit(ctgy, r[0]);
                break;
            }
        }
    }
    RandomPickerPost();

    var msg_arr = [
        'そろそろランチにしませんか?',
        'ランチの時間ですよ！',
        '今日のおすすめはこちらです。',
        'お腹すきましたね',
        'お昼です！',
        'お昼の時間です！',
        'ご飯行きましょう!!',
        'ドーモ オセワニナリマス 食事の時間だ :ninja:'
    ];

    const do_get = _prop.getProperty("DO_GET_METHOD");
    const code_url = _prop.getProperty("CODE_URL");
    const message = `
${random_array(msg_arr)}
<https://open.vein.space/#/invite?token=a34206d0-4a3b-11e9-a5a3-ebf91e154abd|PR 社内はてなサービス veinログインしてね!!!!>
${rows.join('\n')}
<https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit|候補を編集する>
<${do_get}|ガチャを回す>
( <${code_url}|Code> <https://github.com/timedia/gohan-bot|:github:> )
`;
    post_message(message, SLACK_WEBHOOK);
    return message;
}
