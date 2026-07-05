"use client";

import React from "react";
import GitHubAccounts from "@/components/github/GitHubAccounts";

export default function Page() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">GitHub Accounts</h1>
      <p className="text-sm text-gray-600 mt-1">Manage personal access tokens and linked GitHub accounts.</p>
      <div className="mt-6">
        <GitHubAccounts />
      </div>
    </div>
  );
}
