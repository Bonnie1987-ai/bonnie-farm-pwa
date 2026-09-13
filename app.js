const BF = (() => {

  const CONFIG = {

    API_URL:
      "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE",

    API_KEY:
      "3kdBDIxKhBBqhLDOST3hVhQfQ2qY7kM9",

    DB_NAME:
      "BonnieFarmOfflineDB",

    DB_VERSION:
      1,

    STORE:
      "pendingRecords"

  };


  let db = null;


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
              { unique: false }
            );

            store.createIndex(
              "status",
              "status",
              { unique: false }
            );

          }

        };


      request.onsuccess =
        event => {

          db =
            event.target.result;

          resolve(db);

        };


      request.onerror =
        () => {

          reject(
            request.error
          );

        };

    });

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
            request.error
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
            request.error
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
            request.error
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
   * DATE
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

    const date =
      new Date(
        dateString + "T00:00:00"
      );

    return date.toLocaleDateString(
      "en-GB",
      {
        weekday: "long"
      }
    );

  }


  /************************************************
   * SAVE SALE
   ************************************************/

  async function saveSale() {

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


    if (!record.day) {

      record.day =
        dayName(record.date);

    }


    await addRecord(record);

    document
      .getElementById(
        "salesForm"
      )
      .reset();

    setDefaultDates();

    showMessage(
      "Sale saved on this device. It will synchronise automatically."
    );

    updateCounters();

    if (navigator.onLine) {

      syncAll();

    }

  }


  /************************************************
   * SAVE EXPENSE
   ************************************************/

  async function saveExpense() {

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


    if (!record.day) {

      record.day =
        dayName(record.date);

    }


    await addRecord(record);

    document
      .getElementById(
        "expenseForm"
      )
      .reset();

    setDefaultDates();

    showMessage(
      "Expense saved on this device. It will synchronise automatically."
    );

    updateCounters();

    if (navigator.onLine) {

      syncAll();

    }

  }


  /************************************************
   * JSONP SYNC
   ************************************************/

  function sendToServer(
    action,
    record
  ) {

    return new Promise(
      (resolve, reject) => {

        const callbackName =
          "BF_CALLBACK_" +
          Date.now() +
          "_" +
          Math.floor(
            Math.random() * 100000
          );


        window[callbackName] =
          response => {

            delete window[
              callbackName
            ];

            if (
              script.parentNode
            ) {

              script.parentNode
                .removeChild(
                  script
                );

            }

            resolve(response);

          };


        const json =
          JSON.stringify(record);

        const encoded =
          btoa(
            unescape(
              encodeURIComponent(
                json
              )
            )
          )
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");


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
          callbackName;


        const script =
          document.createElement(
            "script"
          );


        script.src = url;


        script.onerror =
          () => {

            delete window[
              callbackName
            ];

            if (
              script.parentNode
            ) {

              script.parentNode
                .removeChild(
                  script
                );

            }

            reject(
              new Error(
                "Unable to contact Bonnie Farm server."
              )
            );

          };


        document.body.appendChild(
          script
        );


        setTimeout(
          () => {

            if (
              window[
                callbackName
              ]
            ) {

              delete window[
                callbackName
              ];

              if (
                script.parentNode
              ) {

                script.parentNode
                  .removeChild(
                    script
                  );

              }

              reject(
                new Error(
                  "Server timeout."
                )
              );

            }

          },
          20000
        );

      }
    );

  }


  /************************************************
   * SYNCHRONISE ALL
   ************************************************/

  async function syncAll() {

    if (!navigator.onLine) {

      showMessage(
        "Device is offline. Records remain safely stored on this device."
      );

      return;

    }


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

      showMessage(
        "Everything is already synchronised."
      );

      updateCounters();

      return;

    }


    showMessage(
      "Synchronising " +
      pending.length +
      " record(s)..."
    );


    let successful = 0;


    for (
      const record of pending
    ) {

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


        if (
          response &&
          response.ok
        ) {

          await deleteRecord(
            record.offlineId
          );

          successful++;

        }

      } catch (error) {

        console.log(
          "Sync failed:",
          error
        );

      }

    }


    updateCounters();


    const remaining =
      (
        await getAllRecords()
      ).filter(
        r =>
          r.status ===
          "pending"
      ).length;


    if (
      remaining === 0
    ) {

      showMessage(
        "Synchronisation completed successfully."
      );

    } else {

      showMessage(
        successful +
        " record(s) synchronised. " +
        remaining +
        " record(s) remain pending."
      );

    }

  }


  /************************************************
   * COUNTERS
   ************************************************/

  async function updateCounters() {

    const records =
      await getAllRecords();

    const sales =
      records.filter(
        r =>
          r.type === "sale" &&
          r.status === "pending"
      ).length;

    const expenses =
      records.filter(
        r =>
          r.type === "expense" &&
          r.status === "pending"
      ).length;


    document.getElementById(
      "salesPending"
    ).textContent = sales;


    document.getElementById(
      "expensesPending"
    ).textContent = expenses;

  }


  /************************************************
   * CONNECTION STATUS
   ************************************************/

  function updateConnectionStatus() {

    const element =
      document.getElementById(
        "connectionStatus"
      );


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

  function showMessage(message) {

    const element =
      document.getElementById(
        "message"
      );

    if (element) {

      element.textContent =
        message;

    }

  }


  /************************************************
   * DEFAULT DATES
   ************************************************/

  function setDefaultDates() {

    const current =
      today();


    document.getElementById(
      "saleDate"
    ).value = current;


    document.getElementById(
      "saleDay"
    ).value =
      dayName(current);


    document.getElementById(
      "expenseDate"
    ).value = current;


    document.getElementById(
      "expenseDay"
    ).value =
      dayName(current);

  }


  /************************************************
   * CLEAR COMPLETED
   ************************************************/

  async function clearCompleted() {

    const records =
      await getAllRecords();

    let count = 0;


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

    updateCounters();

  }


  /************************************************
   * INITIALISE
   ************************************************/

  async function init() {

    await openDatabase();

    setDefaultDates();

    updateConnectionStatus();

    updateCounters();


    document
      .getElementById(
        "salesForm"
      )
      .addEventListener(
        "submit",
        event => {

          event.preventDefault();

          saveSale();

        }
      );


    document
      .getElementById(
        "expenseForm"
      )
      .addEventListener(
        "submit",
        event => {

          event.preventDefault();

          saveExpense();

        }
      );


    window.addEventListener(
      "online",
      () => {

        updateConnectionStatus();

        showMessage(
          "Internet connection restored. Synchronising..."
        );

        syncAll();

      }
    );


    window.addEventListener(
      "offline",
      () => {

        updateConnectionStatus();

        showMessage(
          "Offline mode activated. Your entries will remain on this device."
        );

      }
    );


    /*
     * Try synchronisation periodically.
     */
    setInterval(
      () => {

        if (navigator.onLine) {
          syncAll();
        }

      },
      30000
    );


    /*
     * Register the Service Worker.
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

  }


  return {

    init,
    syncAll,
    clearCompleted

  };

})();


document.addEventListener(
  "DOMContentLoaded",
  () => BF.init()
);
