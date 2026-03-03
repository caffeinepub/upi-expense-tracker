import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type Category = Text;

  public type Transaction = {
    id : Text;
    amount : Nat;
    merchant : Text;
    timestamp : Time.Time;
    category_hint : Text;
  };

  public type MonthlySummary = {
    category : Category;
    total_amount : Nat;
  };

  public type UserProfile = {
    name : Text;
    email : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();
  let transactions = Map.empty<Principal, List.List<Transaction>>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func addTransaction(transaction : Transaction) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add transactions");
    };
    if (transaction.amount == 0) { Runtime.trap("Amount must be greater than 0") };
    let userTransactions = switch (transactions.get(caller)) {
      case (null) { List.empty<Transaction>() };
      case (?existing) { existing };
    };
    userTransactions.add(transaction);
    transactions.add(caller, userTransactions);
  };

  public query ({ caller }) func getTransactions() : async [Transaction] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can retrieve transactions");
    };
    switch (transactions.get(caller)) {
      case (?txs) { txs.toArray() };
      case (null) { [] };
    };
  };

  public shared ({ caller }) func deleteAllData() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete their data");
    };
    transactions.remove(caller);
  };

  public query ({ caller }) func getMonthlyExpenseSummary(_timestamp : Time.Time) : async [MonthlySummary] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view expense summaries");
    };
    let userTransactions = switch (transactions.get(caller)) {
      case (null) { return [] };
      case (?entries) { entries };
    };

    let summaryMap = Map.empty<Category, Nat>();

    for (transaction in userTransactions.values()) {
      let currentTotal = switch (summaryMap.get(transaction.category_hint)) {
        case (null) { 0 };
        case (?amount) { amount };
      };
      summaryMap.add(transaction.category_hint, currentTotal + transaction.amount);
    };

    summaryMap.entries().map(func(entry) { { category = entry.0; total_amount = entry.1 } }).toArray();
  };
};
