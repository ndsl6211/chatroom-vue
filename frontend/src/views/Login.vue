<template>
  <div class="login">
    <label for="username">username</label>
    <input
      type="name"
      name="username"
      v-model="username"
      @keyup.enter="login"
    />

    <label for="password">password</label>
    <input
      type="password"
      name="password"
      v-model="password"
      @keyup.enter="login"
    />

    <button @click="login">login</button>
    <button @click="clear">clear</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      username: "",
      password: "",
    };
  },
  mounted() {
    if (this.$cookies.get("user")) {
      this.$router.back();
    }
  },
  methods: {
    async login() {
      try {
        await this.$axios.post("/auth/login", {
          username: this.username,
          password: this.password,
        });

        localStorage.setItem("user", this.username);
        this.$router.push("/chatroom");
      } catch (e) {
        alert(e.response.data);
      }
    },
    clear() {
      this.username = "";
      this.password = "";
    },
  },
};
</script>

<style scoped>
.login {
  color: white;
}
</style>
