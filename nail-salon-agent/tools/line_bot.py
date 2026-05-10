from flask import Flask, request
from linebot import LineBotApi, WebhookHandler
from linebot.models import TextSendMessage
import subprocess

app = Flask(__name__)

line_bot_api = LineBotApi("RXy5YaY6qSYKFtJB26BV8ZitbodZirLqMtO5rMsj2Pre/MocW9Fuj+6VZcAhAiJlcG5j+0Jv8DLnyWKcaSMHvfevk6Oc/UAdlJ3g6U9A4/35NEj8sA4zftf1ImCL4hK4jJOIgAx6pzxmNfl5rvDG8QdB04t89/1O/w1cDnyilFU=")
handler = WebhookHandler("79ded784e86df25da636d8d9c530fa37")

@app.route("/webhook", methods=['POST'])
def webhook():
    body = request.json
    user_msg = body['events'][0]['message']['text']

    # ส่งข้อความให้ Claude CLI
    result = subprocess.check_output(
        ["claude", user_msg]
    ).decode("utf-8")

    line_bot_api.reply_message(
        body['events'][0]['replyToken'],
        TextSendMessage(text=result)
    )
    return "ok"