<template>
  <div class="chatroom">
    <nav class="header">
      <span class="title">Welcome to chatroom, {{ me }}</span>
    </nav>
    <div class="logout-area">
      <button class="logout" @click="logout">logout</button>
    </div>
    <div class="content">
      <div class="chat">
        <div class="user-list">
          <div
            class="user"
            :class="{ active: idx === selectedUserIdx }"
            v-for="(user, idx) in users"
            :key="user"
            @click="selectUser(idx)"
          >
            <img class="avatar" src="@/assets/avatar-0.png" />
            <span class="name">{{ user }}</span>
          </div>
        </div>
        <div class="message-area">
          <div class="message-header">
            <h2 class="receiver">
              Send to:
              {{ selectedUserIdx !== -1 ? users[selectedUserIdx] : "" }}
            </h2>
          </div>
          <div class="message-body">
            <div
              class="message-record"
              v-for="(message, idx) in messageHistory"
              :key="idx"
            >
              <div
                v-if="message.to === me && message.from !== me"
                class="incoming-message message"
              >
                <div class="profile">
                  <img class="incoming-avatar" src="@/assets/avatar-0.png" />
                </div>
                <div class="message-content">{{ message.content }}</div>
                <div class="message-time">
                  <span>{{ message.formattedTime }}</span>
                </div>
              </div>
              <div v-if="message.from === me" class="outgoing-message message">
                <div class="message-time">
                  <span>{{ message.formattedTime }}</span>
                </div>
                <div class="message-content">{{ message.content }}</div>
                <!-- <span class="message-time">{{ message.formattedTime }}</span> -->
                <div class="profile">
                  <img class="outgoing-avatar" src="@/assets/avatar-0.png" />
                </div>
              </div>
            </div>
          </div>
          <div class="message-input">
            <input
              class="send-message"
              @keydown.enter="sendMessage"
              v-model="message"
              :disabled="selectedUserIdx === -1"
              :class="{ disabled: selectedUserIdx === -1 }"
            />
            <span class="icon-send">
              <!-- <i class="fas fa-paper-plane fa-2x"></i> -->
              <i
                class="fa-solid fa-paper-plane fa-2x"
                @click="sendMessage"
                :class="{ disabled: message === '' }"
              />
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import moment from "moment";

export default {
  name: "Chatroom",
  data() {
    return {
      ws: null,
      users: [],
      me: "",
      selectedUserIdx: -1,
      message: "",
      messageHistory: [],
    };
  },
  mounted() {
    if (!this.$cookies.get("user")) {
      alert("請重新登入");
      this.$router.push("/login");
    } else {
      const ws = new WebSocket("ws://localhost:10001/websocket");
      this.me = this.$cookies.get("user");
      this.ws = ws;

      const eventHandlerMap = {
        updateUserList: this.updateUserList,
        updateMessageHistory: this.updateMessageHistory,
        message: this.onMessage,
      };

      ws.onopen = () => {
        console.log("websocket connection established");
      };
      ws.onmessage = (event) => {
        const e = JSON.parse(event.data);

        eventHandlerMap[e.eventType](e.data);
      };
    }
  },
  methods: {
    logout() {
      this.ws.close();
      this.$cookies.remove("user");
      try {
        this.$axios.post("/auth/logout");
        this.$router.push("/login");
      } catch (e) {
        alert("failed to logout");
      }
    },
    // handler of selecting user
    selectUser(idx) {
      this.selectedUserIdx = idx;

      // retrieve message history from ws server when switching user window
      this.ws.send(
        JSON.stringify({
          eventType: "messageHistory",
          data: {
            me: this.me,
            targetUser: this.users[idx],
          },
        })
      );
    },
    // ws event handler
    updateUserList({ userList }) {
      this.users = userList;
      if (this.selectedUserIdx >= this.users.length) {
        this.selectedUserIdx = -1;
        this.messageHistory = [];
      }
    },
    // ws event handler
    updateMessageHistory({ messages }) {
      this.messageHistory = messages.map((msg) => {
        return {
          ...msg,
          formattedTime: moment(msg.timestamp).format("MMM DD HH:mm:ss"),
        };
      });
    },
    // user send message to other user
    sendMessage() {
      // if
      if (this.message === "") return;
      const user = this.users[this.selectedUserIdx];
      this.ws.send(
        JSON.stringify({
          eventType: "message",
          data: {
            from: this.me,
            to: user,
            content: this.message,
            timestamp: Date.now(),
          },
        })
      );
      this.message = "";
    },
    // when user receive message from ws server
    onMessage({ messages }) {
      // if received message list is empty, do nothing
      if (!messages.length) return;

      const timeFormattedMessages = messages.map((msg) => {
        return {
          ...msg,
          formattedTime: moment(msg.timestamp).format("MMM DD HH:mm:ss"),
        };
      });

      // get the last (latest) message from message list
      const lastMessage = timeFormattedMessages.slice(-1)[0];
      if (
        lastMessage.from === this.me ||
        lastMessage.from === this.users[this.selectedUserIdx]
      ) {
        this.messageHistory = timeFormattedMessages;
      }
    },
  },
  watch: {},
};
</script>

<style scoped>
.chatroom {
  height: 100%;
  box-sizing: border-box;
}
.header {
  display: flex;
  padding: 20px;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
}
.logout-area {
  display: flex;
  justify-content: center;
}
.logout {
  font-size: 1.1rem;
}
.title {
  display: inline;
  color: white;
  height: 10%;
}
.content {
  height: 90%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.chat {
  width: 800px;
  height: 600px;
  background: rgb(255, 255, 250);
  border: rgb(0, 152, 86) 4px solid;
  border-radius: 3px;
  display: flex;
}
.user-list {
  width: 30%;
  border-right: solid rgb(0, 67, 38) 3px;
}
.message-area {
  width: 70%;
  padding: 5px;
  position: relative;
}
.user {
  display: flex;
  align-items: center;
  margin: 5px;
  padding: 5px;
  border-radius: 5px;
}
.user.active {
  background-color: rgb(175, 175, 175) !important;
}
.user:hover {
  background-color: rgb(206, 206, 206);
}
.user .avatar {
  width: 50px;
  height: 50px;
  border: 2px black solid;
  border-radius: 50%;
}
.user .name {
  margin-left: 10px;
}
.message-header {
  height: 10%;
}
.message-body {
  height: 75%;
  padding: 10px 5px;
  box-sizing: border-box;
  border-top: 1px solid rgb(221, 221, 221);
  border-bottom: 1px solid rgb(221, 221, 221);
  overflow: scroll;
}
.receiver {
  margin: 0;
  padding: 15px 0;
}
.message-input {
  height: 15%;
  position: absolute;
  left: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: space-around;
}
.message-input input {
  border: none;
  outline: none;
  background-color: rgb(255, 255, 200, 0);
  height: 100%;
  width: 100%;
  font-size: 18px;
}
.message-input input.disabled {
  cursor: not-allowed;
}
.icon-send {
  cursor: pointer;
  width: 40px;
}
.icon-send .disabled {
  color: rgb(146, 146, 146);
  cursor: not-allowed;
}
.message {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  height: 50px;
}
.message-content {
  background: rgb(4, 255, 0);
  border-radius: 15px;
  padding: 5px 8px;
  font-size: 1.1rem;
  margin: 0 5px;
}
.message-time {
  font-size: 12px;
  height: 100%;
  display: flex;
  align-items: flex-end;
}
.incoming-message {
  justify-content: left;
}
.outgoing-message {
  justify-content: right;
}
.incoming-message .profile,
.outgoing-message .profile {
  height: 50px;
  width: 50px;
}
.incoming-avatar,
.outgoing-avatar {
  width: 100%;
  height: 100%;
}
</style>
