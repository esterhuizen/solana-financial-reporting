## **Financial reporting App**

A program that tracks transactions for a specific Solana Wallet

### **1\. Problem Statement and System Overview**

* High level problem statement: We need to track all transactions on specific Solana wallets for compliance  
* High level solution description: We need a web app that will capture in our database all transactions for a specific Solana wallet, and provide a web frontend that shows this in a table report format.  
* Functionality: If we can select dates on which to see all transactions, the wallet addresses involved in sending and receiving, whether it was incoming or going Solana, and the amount of Solana involved in the transaction \- for each transaction  
* Roles: this is to be used by our internal compliance person

### **2\. Data Architecture**

* Table 1: The data is to be stored within a table called wallet\_transactions and should contain the fields:  
  * id: unique id of the transation  
  * from\_wallet: this is a Solana wallet address  
  * to\_wallet: this is a Solana wallet address  
  * amount: number of lamports in transaction  
  * time: when the transaction occurred  
* Table 2: table containing the list of available wallets to be reported on  
  * id: unique id of the wallet address  
  * address: wallet address  
* Database details:  
  * Type: PostgreSQL  
  * Credentials:  
    * DB\_USER=xxxx DB\_PASSWORD=xxxx DB\_HOST=localhost DB\_PORT=5432 DB\_DATABASE=webapp

### **3\. Functional Requirements**

* User stories organized by persona/role  
  * The compliance user will navigate to a web landing page and be able to select the dates for which to search  
  * The known wallet that needs to be reporter on first is: Df9nkXFqWJsm1pjjjfZ1R7uFKkwoSBcAvEYyjy36pVjz  
  * There should be a function that allows the user to add and remove wallet addresses he wants to report  
* Detailed use cases with step-by-step flows  
  * When the user then selects "search" he will see a table showing all relevant transaction data

### **4\. Technical Architecture**

* System components and their interactions  
  * Backend program  
    * A backend program will collect and store the data on our database once every day.  
    * It will be in javascript and will be run from the cli  
  * API program  
    * The API will be written in express.js   
    * Will run on port 5001  
    * The API program will have two get calls:  
      * wallets: this will return all wallets that the user can select from  
      * transactions: this will return all the transactions that falls within the search criteria  
    * The API program will have one set call:  
      * addwallet: this will allow the user to add or remove wallets from the list of wallets  
  * Frontend program  
    * Will run on port 3001  
    * A Next.js frontend with clean and legible layout and font. White on dark grey colour scheme  
    * Will be the landing page.  
    * Will make very basic calls to the API to get or set data  
    * Will present the financial reporting data in a clean table format


