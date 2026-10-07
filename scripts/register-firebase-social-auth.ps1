<#
.SYNOPSIS
    Guided setup checklist for Firebase Authentication and social OAuth providers.

.DESCRIPTION
    Prints console steps and callback URLs needed to register the WoodworkingShop
    web app with Google, Facebook, and GitHub through Firebase Authentication.
    It also prints a restrictive Firestore rules starter for per-user project JSON.
    This is instructional only: it does not create resources, change provider
    settings, deploy rules, install SDKs, or implement app login and sync. It
    never asks for or stores OAuth client secrets.

.PARAMETER FirebaseProjectId
    Existing Firebase project ID. If omitted, the script prompts for it.

.PARAMETER AuthDomain
    authDomain copied from the Firebase web-app configuration. Defaults to
    <FirebaseProjectId>.firebaseapp.com. Use the exact custom domain if configured.

.PARAMETER SiteUrl
    Public app URL. Its hostname is printed for Firebase Authorized domains.

.PARAMETER AdditionalAuthorizedDomains
    Additional hostnames, such as localhost or a stable preview domain. Supply
    hostnames only: no scheme, path, port, or wildcard.

.PARAMETER OpenLinks
    Open the Firebase, Google Cloud, Facebook, GitHub, and documentation pages.

.EXAMPLE
    .\scripts\register-firebase-social-auth.ps1

.EXAMPLE
    .\scripts\register-firebase-social-auth.ps1 -FirebaseProjectId cabinet-planner-prod `
        -AuthDomain cabinet-planner-prod.firebaseapp.com `
        -SiteUrl https://rajwanyair.github.io/WoodworkingShop `
        -AdditionalAuthorizedDomains localhost -OpenLinks
#>

[CmdletBinding()]
param(
    [string]$FirebaseProjectId,
    [string]$AuthDomain,
    [string]$SiteUrl = 'https://rajwanyair.github.io/WoodworkingShop',
    [string[]]$AdditionalAuthorizedDomains = @(),
    [switch]$OpenLinks
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Section {
    param([Parameter(Mandatory)][string]$Title)

    Write-Host ''
    Write-Host ('=' * 76) -ForegroundColor DarkCyan
    Write-Host $Title -ForegroundColor Cyan
    Write-Host ('=' * 76) -ForegroundColor DarkCyan
}

function Write-GuideStep {
    param(
        [Parameter(Mandatory)][string]$Number,
        [Parameter(Mandatory)][string]$Title,
        [Parameter(Mandatory)][string[]]$Details,
        [string]$Url
    )

    Write-Host ''
    Write-Host "$Number. $Title" -ForegroundColor Yellow
    foreach ($detail in $Details) {
        Write-Host "   $detail"
    }
    if ($Url) {
        Write-Host "   Console/docs: $Url" -ForegroundColor DarkGray
        if ($OpenLinks) {
            Start-Process $Url
        }
    }
}

function Test-HostName {
    param([Parameter(Mandatory)][string]$Value)

    return $Value -match '^(?=.{1,253}$)([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$'
}

if ([string]::IsNullOrWhiteSpace($FirebaseProjectId)) {
    $FirebaseProjectId = Read-Host 'Enter the existing Firebase project ID (not its display name)'
}

if ($FirebaseProjectId -notmatch '^[a-z0-9-]{6,30}$') {
    throw 'FirebaseProjectId must be the 6-30 character lowercase project ID shown in Firebase project settings.'
}

if ([string]::IsNullOrWhiteSpace($AuthDomain)) {
    $AuthDomain = "$FirebaseProjectId.firebaseapp.com"
}

if (-not (Test-HostName $AuthDomain)) {
    throw 'AuthDomain must be a hostname only, without https://, a path, or a port.'
}

try {
    $siteUri = [Uri]::new($SiteUrl, [UriKind]::Absolute)
} catch {
    throw "SiteUrl must be an absolute HTTP(S) URL. Received: $SiteUrl"
}

if ($siteUri.Scheme -notin @('https', 'http')) {
    throw 'SiteUrl must use HTTPS in production. HTTP is accepted only for local development.'
}

$authorizedDomains = @($siteUri.Host) + $AdditionalAuthorizedDomains
foreach ($domain in $authorizedDomains) {
    if (-not (Test-HostName $domain)) {
        throw "Authorized domain '$domain' is invalid. Supply exact hostnames only; wildcards are not supported."
    }
}
$authorizedDomains = @($authorizedDomains | Sort-Object -Unique)

$projectSegment = [Uri]::EscapeDataString($FirebaseProjectId)
$firebaseConsole = "https://console.firebase.google.com/project/$projectSegment"
$authHandler = "https://$AuthDomain/__/auth/handler"

Write-Section 'Firebase social authentication setup'
Write-Host "Firebase project: $FirebaseProjectId"
Write-Host "Web app URL:      $SiteUrl"
Write-Host "Firebase auth:    $AuthDomain"
Write-Host "OAuth callback:   $authHandler"
Write-Host ''
Write-Host 'This script is a registration guide only. It does not add login or cloud sync to the app.' -ForegroundColor Magenta
Write-Host 'Never enter provider client secrets in chat, source files, VITE_* variables, or a browser build.' -ForegroundColor Magenta

Write-Section '1. Create/register the Firebase web app'
Write-GuideStep -Number '1' -Title 'Select the existing Firebase project' -Details @(
    'Open the Firebase project and add a Web app if one is not already registered.',
    'Use a clear nickname such as WoodworkingShop Web. Firebase Hosting is not required for the current GitHub Pages deployment.',
    'Copy the web configuration. The authDomain must match the value used by this guide.',
    'The Firebase web apiKey/appId identify the client project; they are not OAuth client secrets. Keep provider client secrets server-side in Firebase configuration only.'
) -Url "$firebaseConsole/settings/general"

Write-Section '2. Register OAuth applications at each provider'
Write-GuideStep -Number '2a' -Title 'Google' -Details @(
    'In Firebase Console, open Authentication > Sign-in method (or Authentication > Providers) and enable Google.',
    'Choose a support email and save. If Firebase requests a Google OAuth client, create/select a Web application client in Google Cloud Credentials.',
    'Use the redirect URI shown by Firebase. With the default authDomain it is usually the callback printed above; copy the Firebase-displayed value exactly.',
    'Do not request extra Google scopes unless a later product feature requires them.'
) -Url 'https://console.cloud.google.com/apis/credentials'

Write-GuideStep -Number '2b' -Title 'Facebook' -Details @(
    'Create a Facebook developer app at Meta for Developers and add the Facebook Login product for Web.',
    'In Facebook Login settings, enable Web OAuth login and add the exact callback below to Valid OAuth Redirect URIs.',
    'Copy the Facebook App ID and App Secret into Firebase Authentication > Facebook provider. Do not put the App Secret in the website.',
    'Keep the Facebook app in Development mode while testing with listed test users. Before public launch, complete Meta review and publish the app as required.',
    'Request only public_profile and email unless another approved feature needs more permissions.'
) -Url 'https://developers.facebook.com/apps/'

Write-GuideStep -Number '2c' -Title 'GitHub' -Details @(
    'Open GitHub Settings > Developer settings > OAuth Apps and register a new OAuth App.',
    "Set the Homepage URL to $SiteUrl (or the canonical origin if preferred).",
    "Set Authorization callback URL to exactly: $authHandler",
    'Copy the GitHub Client ID and generate a Client Secret. Enter both in Firebase Authentication > GitHub provider; never expose the Client Secret in client code.',
    'Use a separate OAuth App for local/dev if you want separate callback and consent branding.'
) -Url 'https://github.com/settings/developers'

Write-Section '3. Enable providers and authorize app domains in Firebase'
Write-GuideStep -Number '3' -Title 'Configure Firebase Authentication' -Details @(
    'Open Authentication > Sign-in method/Providers. Enable Google, Facebook, and GitHub one at a time.',
    'For Facebook and GitHub, paste the provider Client ID and Client Secret into Firebase Console, not into this script.',
    'Open Authentication > Settings > Authorized domains and add these exact hosts:'
) -Url "$firebaseConsole/authentication/providers"

foreach ($domain in $authorizedDomains) {
    Write-Host "   - $domain"
}

Write-Host '   Add localhost only for local development. Do not authorize a wildcard preview domain.'
Write-Host '   Firebase provider callback host and Firebase Authorized domains are separate settings; verify both.'

Write-GuideStep -Number '4' -Title 'Verify the provider callback URLs' -Details @(
    'Google: use the redirect URI Firebase displays in its Google provider configuration.',
    "Facebook Valid OAuth Redirect URI: $authHandler",
    "GitHub Authorization callback URL: $authHandler",
    'If you later use a custom authDomain, update every provider callback to the new Firebase handler URL and test all providers again.'
) -Url 'https://firebase.google.com/docs/auth/web/github-auth'

Write-Section '4. Create Firestore for per-account project JSON'
Write-GuideStep -Number '5' -Title 'Create the database' -Details @(
    'Create a Cloud Firestore database in Native mode and select the production region deliberately; the region is difficult to change later.',
    'Do not start in test mode. Publish restrictive rules before the app writes any customer data.',
    'Use a per-user path such as users/{uid}/projects/{projectId}. Obtain uid only from the verified Firebase Auth session.',
    'A project document can contain schemaVersion, name, updatedAt, revision, and validated project JSON. Keep documents under Firestore limits and version/migrate the project schema.',
    'Keep IndexedDB as the local source of truth. Make cloud backup/sync explicitly opt-in, show sync/error status, and define conflict, account deletion, and export behavior before release.'
) -Url "$firebaseConsole/firestore/databases"

Write-Host ''
Write-Host 'Firestore Rules starter (review and test in the Emulator Suite before publishing):' -ForegroundColor Cyan
$firestoreRules = @(
    "rules_version = '2';",
    'service cloud.firestore {',
    '  match /databases/{database}/documents {',
    '    match /users/{uid}/projects/{projectId} {',
    '      function isOwner() {',
    '        return request.auth != null && request.auth.uid == uid;',
    '      }',
    '      allow get, list, delete: if isOwner();',
    '      allow create, update: if isOwner()',
    "        && request.resource.data.keys().hasOnly(['schemaVersion', 'name', 'payload', 'updatedAt', 'revision'])",
    "        && request.resource.data.keys().hasAll(['schemaVersion', 'name', 'payload', 'updatedAt', 'revision'])",
    '        && request.resource.data.schemaVersion is int',
    '        && request.resource.data.schemaVersion == 1',
    '        && request.resource.data.name is string',
    '        && request.resource.data.name.size() <= 200',
    '        && request.resource.data.payload is map',
    '        && request.resource.data.updatedAt is timestamp',
    '        && request.resource.data.revision is int;',
    '    }',
    '    match /users/{uid}/usage/{periodId} {',
    '      function isOwner() {',
    '        return request.auth != null && request.auth.uid == uid;',
    '      }',
    '      allow read, delete: if isOwner();',
    '      allow create, update: if isOwner()',
    "        && request.resource.data.keys().hasOnly(['period', 'counts', 'updatedAt'])",
    "        && request.resource.data.keys().hasAll(['period', 'counts', 'updatedAt'])",
    '        && request.resource.data.period is string',
    '        && request.resource.data.counts is map',
    '        && request.resource.data.updatedAt is timestamp;',
    '    }',
    '    match /{document=**} {',
    '      allow read, write: if false;',
    '    }',
    '  }',
    '}'
)
Write-Host ($firestoreRules -join [Environment]::NewLine)
Write-Host 'Rules note: the usage path is for coarse per-user aggregates only. Do not log cabinet payloads or sensitive behavior as analytics.'

Write-Section '5. Required application work before customers can use this'
Write-Host 'Provider registration does not create a login UI or connect projects to accounts. This repository currently has no Firebase Auth/Firestore integration.' -ForegroundColor Magenta
Write-Host 'Implementation checklist:'
Write-Host '  - Approve an architecture/ADR decision to change the current local-first, no-server policy.'
Write-Host '  - Add the Firebase web SDK only after measuring bundle impact and approving the production-dependency budget.'
Write-Host '  - Build sign-in, sign-out, auth-state restoration, account linking, and accessible provider-specific error handling.'
Write-Host '  - Keep Firebase client config public and environment-specific. Never put Facebook/GitHub client secrets in VITE_* variables.'
Write-Host '  - Keep local projects intact; require explicit consent before uploading or associating local projects with an account.'
Write-Host '  - Implement validated, versioned JSON upload/download, owner-scoped queries, conflict handling, retry/offline states, and user export/delete.'
Write-Host '  - Approve key recovery and a threat model before relying on the existing client-side encrypted sync envelope; Firebase Auth alone does not encrypt stored project data.'
Write-Host '  - Update Content-Security-Policy connect-src for only required Firebase endpoints; do not use broad wildcards.'
Write-Host '  - Add opt-in, disclosed usage aggregation only if needed. The current roadmap rejects implicit analytics.'
Write-Host '  - Test Firestore rules with signed-out, owner, and different-user cases in the Emulator Suite; hidden UI controls are not authorization.'
Write-Host '  - Test popup/redirect behavior in Chromium, Firefox, WebKit, mobile Safari, GitHub Pages, and stable preview domains.'

Write-GuideStep -Number '6' -Title 'Provider and security documentation' -Details @(
    'Read current Firebase provider and redirect guidance before launch; browser privacy restrictions can affect cross-site redirect flows.',
    'Publish a privacy notice explaining which project JSON and usage aggregates are uploaded, retention/deletion behavior, and involved identity providers.',
    'Enable Firebase App Check for the deployed web app after observing valid traffic, then enforce it for supported services. App Check is abuse mitigation, not user authorization.'
) -Url 'https://firebase.google.com/docs/auth/web/redirect-best-practices'

Write-Section 'Completion checklist'
Write-Host '[ ] Firebase web app registered and exact authDomain copied.'
Write-Host '[ ] Google provider enabled and a real sign-in tested.'
Write-Host '[ ] Facebook app configured, callback allow-listed, and provider enabled in Firebase.'
Write-Host '[ ] GitHub OAuth App callback exactly matches the Firebase auth handler.'
Write-Host '[ ] Production/local authorized domains reviewed; no wildcard preview hosts.'
Write-Host '[ ] Firestore production database created in the selected region.'
Write-Host '[ ] Owner-only rules tested in the Emulator Suite and published.'
Write-Host '[ ] App integration, consent, migration, conflict handling, CSP, export/delete, and cross-browser flows implemented and tested.'
Write-Host '[ ] Privacy/legal review and provider app publication/review completed.'
Write-Host ''
Write-Host 'Registration is complete only after each provider can sign in on the deployed origin. Cross-device project continuity requires the separate application integration above.' -ForegroundColor Green
