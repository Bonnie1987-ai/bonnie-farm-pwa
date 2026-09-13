const BF = (() => {

  /************************************************
   * BONNIE FARM PWA CONFIGURATION
   ************************************************/

  const CONFIG = {

    /*
     * IMPORTANT:
     * Replace this with your DEPLOYED Google Apps Script
     * Web App URL ending in /exec.
     *
     * Example:
     * https://script.google.com/macros/s/XXXXXXXX/exec
     */
    API_URL:
      https://script.google.com/macros/s/AKfycbwb6AppjVWGyZXWEGy6DWkGFjgqNaUrBJX8H8_ViEH9phTPHwr2xO2Kr3IUpA7bRWy7QQ/exec

    /*
     * This must match BF_PWA_CONFIG.API_KEY
     * in your Google Apps Script.
     */
    API_KEY:
      "3kdBDIxKhBBqhLDOST3hVhQfQ2qY7kM9",

    DB_NAME:
      "BonnieFarmOfflineDB",

    DB_VERSION:
      1,

    STORE:
      "pendingRecords",

    SYNC_TIMEOUT:
      30000,

    SYNC_INTERVAL:
      30000

  };


  let db = null;

  /*
   * Prevent two synchronisation processes from
   * running at the same time.
   */
  let syncInProgress = false;


  /************************************************
   * DATABASE
   ************************************************/

  function openDatabase() {

    return new Promise((resolve, reject) => {

      const request =
        indexedDB.open(
          CONFIG.DB_NAME,
          CONFIG.DB_VERSION
        );


      request.onupgradeneeded =
        event => {

          const database =
            event.target.result;

          if (
            !database.objectStoreNames.contains(
              CONFIG.STORE
            )
          ) {

            const store =
              database.createObjectStore(
                CONFIG.STORE,
                {
                  keyPath: "offlineId"
                }
              );


            store.createIndex(
              "type",
              "type",
              {
                unique: false
              }
            );


            store.createIndex(
              "status",
              "status",
              {
                unique: false
              }
            );

          }

        };


      request.onsuccess =
        event => {

          db =
            event.target.result;

          /*
           * If the database connection closes,
           * allow the next operation to reopen it.
           */
          db.onclose = () => {
            db = null;
          };

          db.onerror = event => {
            console.error(
              "IndexedDB error:",
              event.target.error
            );
          };

          resolve(db);

        };


      request.onerror =
        () => {

          reject(
            request.error ||
            new Error(
              "Unable to open offline database."
            )
          );

        };

    });

  }


  async function ensureDatabase() {

    if (!db) {
      await openDatabase();
    }

    return db;

  }


  function addRecord(record) {

    return new Promise(
      (resolve, reject) => {

        const transaction =
          db.transaction(
            CONFIG.STORE,
            "readwrite"
          );

        const store =
          transaction.objectStore(
            CONFIG.STORE
          );

        const request =
          store.put(record);


        request.onsuccess =
          () => resolve();


        request.onerror =
          () => reject(
            request.error ||
            new Error(
              "Unable to save record locally."
            )
          );

      }
    );

  }


  function getAllRecords() {

    return new Promise(
      (resolve, reject) => {

        const transaction =
          db.transaction(
            CONFIG.STORE,
            "readonly"
          );

        const store =
          transaction.objectStore(
            CONFIG.STORE
          );

        const request =
          store.getAll();


        request.onsuccess =
          () => resolve(
            request.result || []
          );


        request.onerror =
          () => reject(
            request.error ||
            new Error(
              "Unable to read offline records."
            )
          );

      }
    );

  }


  function deleteRecord(offlineId) {

    return new Promise(
      (resolve, reject) => {

        const transaction =
          db.transaction(
            CONFIG.STORE,
            "readwrite"
          );

        const store =
          transaction.objectStore(
            CONFIG.STORE
          );

        const request =
          store.delete(
            offlineId
          );


        request.onsuccess =
          () => resolve();


        request.onerror =
          () => reject(
            request.error ||
            new Error(
              "Unable to delete local record."
            )
          );

      }
    );

  }


  /************************************************
   * UNIQUE OFFLINE ID
   ************************************************/

  function createOfflineId() {

    return (
      "BF-" +
      Date.now() +
      "-" +
      Math.random()
        .toString(36)
        .substring(2, 11)
    );

  }


  /************************************************
   * DATE FUNCTIONS
   ************************************************/

  function today() {

    const date =
      new Date();

    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        date.getDate()
      ).padStart(2, "0");


    return (
      year +
      "-" +
      month +
      "-" +
      day
    );

  }


  function dayName(dateString) {

    if (!dateString) {
      return "";
    }

    const date =
      new Date(
        dateString + "T00:00:00"
      );


    if (isNaN(date.getTime())) {
      return "";
    }


    return date.toLocaleDateString(
      "en-GB",
      {
        weekday: "long"
      }
    );

  }


  /************************************************
   * VALIDATE API CONFIGURATION
   ************************************************/

  function apiConfigured() {

    return (
      CONFIG.API_URL &&
      CONFIG.API_URL !==
        "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE" &&
      /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(
        CONFIG.API_URL
      )
    );

  }


  /************************************************
   * SAVE SALE
   ************************************************/

  async function saveSale() {

    try {

      await ensureDatabase();


      const date =
        document.getElementById(
          "saleDate"
        ).value;


      const record = {

        offlineId:
          createOfflineId(),

        type:
          "sale",

        status:
          "pending",

        createdAt:
          new Date().toISOString(),

        day:
          document.getElementById(
            "saleDay"
          ).value.trim(),

        date:
          date,

        product:
          document.getElementById(
            "saleProduct"
          ).value,

        quantity:
          Number(
            document.getElementById(
              "saleQuantity"
            ).value
          ),

        amount:
          Number(
            document.getElementById(
              "saleAmount"
            ).value
          ),

        customer:
          document.getElementById(
            "saleCustomer"
          ).value.trim(),

        soldBy:
          document.getElementById(
            "saleSoldBy"
          ).value,

        remarks:
          document.getElementById(
            "saleRemarks"
          ).value.trim()

      };


      /*
       * Basic validation.
       */

      if (!record.date) {

        showMessage(
          "Please select the sale date."
        );

        return;

      }


      if (!record.product) {

        showMessage(
          "Please select a product."
        );

        return;

      }


      if (
        !Number.isFinite(record.quantity) ||
        record.quantity <= 0
      ) {

        showMessage(
          "Please enter a valid sale quantity."
        );

        return;

      }


      if (
        !Number.isFinite(record.amount) ||
        record.amount < 0
      ) {

        showMessage(
          "Please enter a valid sale amount."
        );

        return;

      }


      if (!record.day) {

        record.day =
          dayName(
            record.date
          );

      }


      /*
       * Save locally FIRST.
       *
       * This guarantees that the sale is not lost
       * even when the Internet fails.
       */

      await addRecord(record);


      const salesForm =
        document.getElementById(
          "salesForm"
        );

      if (salesForm) {
        salesForm.reset();
      }


      setDefaultDates();


      showMessage(
        "Sale saved on this device. " +
        "It will synchronise automatically."
      );


      await updateCounters();


      /*
       * Try synchronisation immediately when online.
       */

      if (navigator.onLine) {

        await syncAll();

      }

    } catch (error) {

      console.error(
        "Save sale error:",
        error
      );

      showMessage(
        "Sale was saved locally, but an error occurred: " +
        error.message
      );

    }

  }


  /************************************************
   * SAVE EXPENSE
   ************************************************/

  async function saveExpense() {

    try {

      await ensureDatabase();


      const date =
        document.getElementById(
          "expenseDate"
        ).value;


      const record = {

        offlineId:
          createOfflineId(),

        type:
          "expense",

        status:
          "pending",

        createdAt:
          new Date().toISOString(),

        day:
          document.getElementById(
            "expenseDay"
          ).value.trim(),

        date:
          date,

        description:
          document.getElementById(
            "expenseDescription"
          ).value.trim(),

        quantity:
          Number(
            document.getElementById(
              "expenseQuantity"
            ).value
          ),

        amount:
          Number(
            document.getElementById(
              "expenseAmount"
            ).value
          ),

        supplier:
          document.getElementById(
            "expenseSupplier"
          ).value.trim(),

        paidBy:
          document.getElementById(
            "expensePaidBy"
          ).value.trim(),

        categories:
          document.getElementById(
            "expenseCategory"
          ).value.trim()

      };


      /*
       * Basic validation.
       */

      if (!record.date) {

        showMessage(
          "Please select the expense date."
        );

        return;

      }


      if (!record.description) {

        showMessage(
          "Please enter the expense description."
        );

        return;

      }


      if (
        !Number.isFinite(record.quantity) ||
        record.quantity < 0
      ) {

        showMessage(
          "Please enter a valid expense quantity."
        );

        return;

      }


      if (
        !Number.isFinite(record.amount) ||
        record.amount <= 0
      ) {

        showMessage(
          "Please enter a valid expense amount."
        );

        return;

      }


      if (!record.day) {

        record.day =
          dayName(
            record.date
          );

      }


      /*
       * Save locally FIRST.
       */

      await addRecord(record);


      const expenseForm =
        document.getElementById(
          "expenseForm"
        );

      if (expenseForm) {
        expenseForm.reset();
      }


      setDefaultDates();


      showMessage(
        "Expense saved on this device. " +
        "It will synchronise automatically."
      );


      await updateCounters();


      if (navigator.onLine) {

        await syncAll();

      }

    } catch (error) {

      console.error(
        "Save expense error:",
        error
      );

      showMessage(
        "Expense was saved locally, but an error occurred: " +
        error.message
      );

    }

  }


  /************************************************
   * JSONP SYNCHRONISATION
   ************************************************/

  function sendToServer(
    action,
    record
  ) {

    return new Promise(
      (resolve, reject) => {

        if (!apiConfigured()) {

          reject(
            new Error(
              "Google Apps Script Web App URL has not been configured."
            )
          );

          return;

        }


        const callbackName =
          "BF_CALLBACK_" +
          Date.now() +
          "_" +
          Math.floor(
            Math.random() * 100000
          );


        let finished =
          false;

        let timeoutId =
          null;


        const script =
          document.createElement(
            "script"
          );


        function cleanup() {

          if (timeoutId) {

            clearTimeout(
              timeoutId
            );

          }


          try {

            delete window[
              callbackName
            ];

          } catch (error) {

            console.warn(
              "Callback cleanup failed:",
              error
            );

          }


          if (
            script.parentNode
          ) {

            script.parentNode.removeChild(
              script
            );

          }

        }


        function succeed(response) {

          if (finished) {
            return;
          }

          finished = true;

          cleanup();

          resolve(
            response
          );

        }


        function fail(error) {

          if (finished) {
            return;
          }

          finished = true;

          cleanup();

          reject(
            error instanceof Error
              ? error
              : new Error(
                  String(error)
                )
          );

        }


        window[callbackName] =
          response => {

            /*
             * Google Apps Script returned JSONP.
             */

            if (
              !response ||
              typeof response !== "object"
            ) {

              fail(
                new Error(
                  "Invalid response received from Google Apps Script."
                )
              );

              return;

            }


            if (!response.ok) {

              fail(
                new Error(
                  response.error ||
                  "Google Apps Script rejected the record."
                )
              );

              return;

            }


            succeed(
              response
            );

          };


        const json =
          JSON.stringify(
            record
          );


        /*
         * Convert UTF-8 JSON to Base64 safely.
         */

        let encoded;

        try {

          encoded =
            btoa(
              unescape(
                encodeURIComponent(
                  json
                )
              )
            )
            .replace(
              /\+/g,
              "-"
            )
            .replace(
              /\//g,
              "_"
            )
            .replace(
              /=+$/,
              ""
            );

        } catch (error) {

          fail(
            new Error(
              "Unable to encode record for synchronisation."
            )
          );

          return;

        }


        const url =
          CONFIG.API_URL +
          "?action=" +
          encodeURIComponent(
            action
          ) +
          "&key=" +
          encodeURIComponent(
            CONFIG.API_KEY
          ) +
          "&data=" +
          encodeURIComponent(
            encoded
          ) +
          "&callback=" +
          encodeURIComponent(
            callbackName
          );


        script.src =
          url;


        script.async =
          true;


        script.onerror =
          () => {

            fail(
              new Error(
                "Unable to contact Google Apps Script. " +
                "Check the Web App URL, deployment and Internet connection."
              )
            );

          };


        document.body.appendChild(
          script
        );


        timeoutId =
          setTimeout(
            () => {

              fail(
                new Error(
                  "Google Apps Script did not respond within " +
                  (CONFIG.SYNC_TIMEOUT / 1000) +
                  " seconds."
                )
              );

            },
            CONFIG.SYNC_TIMEOUT
          );

      }
    );

  }


  /************************************************
   * SYNCHRONISE ALL
   ************************************************/

  async function syncAll() {

    /*
     * Do not start another sync while one is already
     * running.
     */

    if (syncInProgress) {

      console.log(
        "Synchronisation already in progress."
      );

      return;

    }


    if (!navigator.onLine) {

      showMessage(
        "Device is offline. Records remain safely stored on this device."
      );

      return;

    }


    if (!apiConfigured()) {

      showMessage(
        "Synchronisation is not configured. " +
        "Enter your Google Apps Script Web App URL in app.js."
      );

      return;

    }


    syncInProgress =
      true;


    try {

      await ensureDatabase();


      const records =
        await getAllRecords();


      const pending =
        records.filter(
          record =>
            record.status ===
            "pending"
        );


      if (
        pending.length === 0
      ) {

        await updateCounters();

        showMessage(
          "Everything is already synchronised."
        );

        return;

      }


      showMessage(
        "Synchronising " +
        pending.length +
        " record(s)..."
      );


      let successful =
        0;

      let failed =
        0;


      for (
        const record of pending
      ) {

        /*
         * Internet may disappear during synchronisation.
         */

        if (!navigator.onLine) {

          failed +=
            pending.length -
            successful -
            failed;

          break;

        }


        try {

          const action =
            record.type === "sale"
              ? "saveSale"
              : "saveExpense";


          const response =
            await sendToServer(
              action,
              record
            );


          /*
           * The record is deleted locally ONLY when
           * Google Apps Script confirms success.
           */

          if (
            response &&
            response.ok === true
          ) {

            await deleteRecord(
              record.offlineId
            );

            successful++;

            console.log(
              "Synchronised:",
              record.offlineId,
              response
            );

          } else {

            failed++;

            console.error(
              "Server rejected record:",
              record,
              response
            );

          }

        } catch (error) {

          failed++;

          console.error(
            "Sync failed for record:",
            record.offlineId,
            error
          );

        }

      }


      await updateCounters();


      const remainingRecords =
        await getAllRecords();


      const remaining =
        remainingRecords.filter(
          record =>
            record.status ===
            "pending"
        ).length;


      if (
        remaining === 0
      ) {

        showMessage(
          "Synchronisation completed successfully. " +
          successful +
          " record(s) sent to Google Sheets."
        );

      } else {

        showMessage(
          successful +
          " record(s) synchronised. " +
          remaining +
          " record(s) remain pending. " +
          "They will be retried automatically."
        );

      }


      console.log(
        "Synchronisation finished:",
        {
          successful:
            successful,
          failed:
            failed,
          remaining:
            remaining
        }
      );

    } catch (error) {

      console.error(
        "Synchronisation error:",
        error
      );

      showMessage(
        "Synchronisation failed: " +
        error.message +
        " Records remain safely stored on this device."
      );

    } finally {

      syncInProgress =
        false;

    }

  }


  /************************************************
   * COUNTERS
   ************************************************/

  async function updateCounters() {

    try {

      await ensureDatabase();


      const records =
        await getAllRecords();


      const sales =
        records.filter(
          record =>
            record.type === "sale" &&
            record.status === "pending"
        ).length;


      const expenses =
        records.filter(
          record =>
            record.type === "expense" &&
            record.status === "pending"
        ).length;


      const salesElement =
        document.getElementById(
          "salesPending"
        );


      const expensesElement =
        document.getElementById(
          "expensesPending"
        );


      if (salesElement) {

        salesElement.textContent =
          sales;

      }


      if (expensesElement) {

        expensesElement.textContent =
          expenses;

      }

    } catch (error) {

      console.error(
        "Counter update failed:",
        error
      );

    }

  }


  /************************************************
   * CONNECTION STATUS
   ************************************************/

  function updateConnectionStatus() {

    const element =
      document.getElementById(
        "connectionStatus"
      );


    if (!element) {
      return;
    }


    if (navigator.onLine) {

      element.textContent =
        "ONLINE — synchronisation available";

    } else {

      element.textContent =
        "OFFLINE — entries will be saved on this device";

    }

  }


  /************************************************
   * MESSAGE
   ************************************************/

  function showMessage(
    message
  ) {

    const element =
      document.getElementById(
        "message"
      );


    if (element) {

      element.textContent =
        message;

    }


    console.log(
      "Bonnie Farm:",
      message
    );

  }


  /************************************************
   * DEFAULT DATES
   ************************************************/

  function setDefaultDates() {

    const current =
      today();


    const saleDate =
      document.getElementById(
        "saleDate"
      );


    const saleDay =
      document.getElementById(
        "saleDay"
      );


    const expenseDate =
      document.getElementById(
        "expenseDate"
      );


    const expenseDay =
      document.getElementById(
        "expenseDay"
      );


    if (saleDate) {

      saleDate.value =
        current;

    }


    if (saleDay) {

      saleDay.value =
        dayName(
          current
        );

    }


    if (expenseDate) {

      expenseDate.value =
        current;

    }


    if (expenseDay) {

      expenseDay.value =
        dayName(
          current
        );

    }

  }


  /************************************************
   * CLEAR COMPLETED
   ************************************************/

  async function clearCompleted() {

    try {

      await ensureDatabase();


      const records =
        await getAllRecords();


      let count =
        0;


      for (
        const record of records
      ) {

        if (
          record.status ===
          "completed"
        ) {

          await deleteRecord(
            record.offlineId
          );

          count++;

        }

      }


      showMessage(
        count +
        " completed local record(s) cleared."
      );


      await updateCounters();

    } catch (error) {

      console.error(
        "Clear completed error:",
        error
      );

      showMessage(
        "Unable to clear completed records."
      );

    }

  }


  /************************************************
   * INITIALISE
   ************************************************/

  async function init() {

    try {

      await openDatabase();


      setDefaultDates();


      updateConnectionStatus();


      await updateCounters();


      /*
       * SALES FORM
       */

      const salesForm =
        document.getElementById(
          "salesForm"
        );


      if (salesForm) {

        salesForm.addEventListener(
          "submit",
          async event => {

            event.preventDefault();

            await saveSale();

          }
        );

      }


      /*
       * EXPENSE FORM
       */

      const expenseForm =
        document.getElementById(
          "expenseForm"
        );


      if (expenseForm) {

        expenseForm.addEventListener(
          "submit",
          async event => {

            event.preventDefault();

            await saveExpense();

          }
        );

      }


      /*
       * INTERNET RESTORED
       */

      window.addEventListener(
        "online",
        async () => {

          updateConnectionStatus();


          showMessage(
            "Internet connection restored. " +
            "Synchronising..."
          );


          await syncAll();

        }
      );


      /*
       * INTERNET LOST
       */

      window.addEventListener(
        "offline",
        () => {

          updateConnectionStatus();


          showMessage(
            "Offline mode activated. " +
            "Your entries will remain safely stored on this device."
          );

        }
      );


      /*
       * PERIODIC SYNCHRONISATION
       */

      setInterval(
        async () => {

          if (
            navigator.onLine &&
            !syncInProgress
          ) {

            await syncAll();

          }

        },
        CONFIG.SYNC_INTERVAL
      );


      /*
       * REGISTER SERVICE WORKER
       */

      if (
        "serviceWorker" in navigator
      ) {

        try {

          await navigator.serviceWorker.register(
            "./sw.js"
          );


          console.log(
            "Bonnie Farm Service Worker registered."
          );

        } catch (error) {

          console.error(
            "Service Worker registration failed:",
            error
          );

        }

      }


      /*
       * Try synchronisation when the application
       * starts.
       */

      if (navigator.onLine) {

        setTimeout(
          () => {

            syncAll();

          },
          1000
        );

      }


      console.log(
        "Bonnie Farm PWA initialised successfully."
      );

    } catch (error) {

      console.error(
        "Bonnie Farm PWA initialisation failed:",
        error
      );

      showMessage(
        "Application initialisation failed: " +
        error.message
      );

    }

  }


  /************************************************
   * PUBLIC FUNCTIONS
   ************************************************/

  return {

    init,

    syncAll,

    clearCompleted

  };

})();


/************************************************
 * START APPLICATION
 ************************************************/

document.addEventListener(
  "DOMContentLoaded",
  () => {

    BF.init();

  }
);
