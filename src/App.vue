<script setup>
  import { RouterView } from 'vue-router'
  import SidebarComponent from '@/components/SidebarComponent.vue'
  import { SendRequest } from './request.js'
  import { db } from './database.js'
  import { LoadUserdata, loadUserdataFromServer, userdata } from './storage.js'
</script>

<script>
  export default {
    data() {
      return {
        dataLoaded: false,
        dataLoadStatusText: "No data",
        dataIsLoading: false,
        db
      }
    },
    created() {
      this.loadData('userdata');
    },
    methods: {
      loadData() {
        this.dataIsLoading = true;

        this.dataLoadStatusText = "Loading user data";
        loadUserdataFromServer().then((serverData) => {
          if (serverData != null && typeof serverData === 'object' && Object.keys(serverData).length >= 0) {
            userdata.data = serverData;
          } else {
            LoadUserdata('userdata');
          }
          this.dataLoadStatusText = "Loading database";
          SendRequest("GET", siteUrl + "/data.min.json", null, this.dataReceived);
        });
      },
      dataReceived(status, response) {
        if (status == 200) {
          //this._db = JSON.parse(response)
          db.data = JSON.parse(response);
          this.dataLoaded = true;
        } 
        else {
          this.dataLoaded = false;
          this.dataLoadStatusText = "Unable to load database"
        } 
        
        this.dataIsLoading = false;
      },
      defaultData() {
        return {};
      }
    }
  }
</script>

<template>
  <main>
    <!-- Sidebar -->
    <SidebarComponent />

    <!-- Page Content -->
    <section class="d-flex flex-column text-light">
      <RouterView v-if="dataLoaded" />
      <div class="text-center my-5" v-else>
        <span v-if="dataIsLoading" class="spinner-grow spinner-grow-sm text-primary" style="display: inline-block; margin-right: 1rem;" role="status"></span>
        <span class="text-muted">{{ dataLoadStatusText }}</span>
      </div>
    </section>
  </main>
</template>