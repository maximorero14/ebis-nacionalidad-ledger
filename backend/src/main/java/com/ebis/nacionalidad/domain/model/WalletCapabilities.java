package com.ebis.nacionalidad.domain.model;

public record WalletCapabilities(
        boolean isRegistryAdmin,
        boolean isTokenAdmin,
        boolean isCredentialAdmin,
        boolean canReviewForeignAffairs,
        boolean canReviewPolice,
        boolean canIssueCredential,
        boolean canRevokeCredential,
        boolean canMintDemoEuro,
        boolean canManageFaucet,
        boolean canCollectFees) {

    public boolean canSeeInstitutionalCases() {
        return canReviewForeignAffairs || canReviewPolice || canIssueCredential || isRegistryAdmin;
    }
}
