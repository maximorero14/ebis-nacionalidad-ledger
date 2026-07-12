package com.ebis.nacionalidad.infrastructure.web;

import static org.hamcrest.Matchers.is;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ebis.nacionalidad.domain.model.ApplicationRole;
import com.ebis.nacionalidad.domain.model.CaseStatus;
import com.ebis.nacionalidad.domain.model.OnChainCase;
import com.ebis.nacionalidad.domain.port.NationalityLedgerClient;
import com.ebis.nacionalidad.infrastructure.blockchain.ContractsManifest;
import java.math.BigInteger;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Exercises the actual HTTP + Spring Security stack (not the services directly) for the
 * three M6.2 acceptance scenarios: no token, a token whose role/ownership doesn't
 * authorize the request, and access to someone else's case. The ledger port is mocked —
 * this is an authorization test, not a blockchain integration test (that's M5.2/future
 * M6 backend-integration evidence).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers
class SecurityIntegrationTest {

    @Container @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17.10-alpine");

    private static final String CITIZEN_ADDRESS = "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc";
    private static final String OTHER_OWNER_ADDRESS = "0x000000000000000000000000000000000000aa";
    private static final long OWN_CASE_ID = 1L;
    private static final long OTHERS_CASE_ID = 2L;

    @Autowired private MockMvc mockMvc;
    @MockitoBean private NationalityLedgerClient nationalityLedgerClient;
    @MockitoBean private ContractsManifest contractsManifest;

    @BeforeEach
    void seedCases() {
        when(nationalityLedgerClient.readCase(OWN_CASE_ID))
                .thenReturn(Optional.of(onChainCase(OWN_CASE_ID, CITIZEN_ADDRESS)));
        when(nationalityLedgerClient.readCase(OTHERS_CASE_ID))
                .thenReturn(Optional.of(onChainCase(OTHERS_CASE_ID, OTHER_OWNER_ADDRESS)));
        when(nationalityLedgerClient.readCase(999_999L)).thenReturn(Optional.empty());
        when(contractsManifest.chainId()).thenReturn(20260711L);
        when(contractsManifest.tokenAddress()).thenReturn("0xTOKEN");
    }

    private OnChainCase onChainCase(long caseId, String owner) {
        return new OnChainCase(
                caseId, owner, CaseStatus.IN_REVIEW, 0, "0x00", false, false, false, BigInteger.ZERO);
    }

    @Test
    void loginWithDemoCredentialsReturnsAWorkingToken() throws Exception {
        mockMvc
                .perform(
                        post("/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(loginJson("citizen1", "citizen-demo-pass")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role", is("CITIZEN")))
                .andExpect(jsonPath("$.evmAddress", is(CITIZEN_ADDRESS)));
    }

    @Test
    void loginWithWrongPasswordIsRejected() throws Exception {
        mockMvc
                .perform(
                        post("/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(loginJson("citizen1", "not-the-password")))
                .andExpect(status().isUnauthorized());
    }

    private String loginJson(String username, String password) {
        return "{\"username\":\"%s\",\"password\":\"%s\"}".formatted(username, password);
    }

    @Test
    void requestWithoutATokenIsRejected() throws Exception {
        mockMvc.perform(get("/cases/{caseId}", OWN_CASE_ID)).andExpect(status().isUnauthorized());
    }

    @Test
    void citizenCanViewTheirOwnCase() throws Exception {
        mockMvc
                .perform(get("/cases/{caseId}", OWN_CASE_ID).with(citizenJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ownerAddress", is(CITIZEN_ADDRESS)));
    }

    @Test
    void citizenTokenIsRejectedForSomeoneElsesCase() throws Exception {
        // Same request demonstrates both "expediente ajeno" (not the owner) and "token de
        // rol erroneo" (CITIZEN is not one of the institutional roles allowed to bypass
        // ownership) — both conditions are the same underlying check in CaseQueryService.
        mockMvc
                .perform(get("/cases/{caseId}", OTHERS_CASE_ID).with(citizenJwt()))
                .andExpect(status().isForbidden());
    }

    @Test
    void institutionalRoleCanViewAnyCase() throws Exception {
        // Positive counterpart: a role-based grant (not ownership) succeeds where the
        // citizen token above was rejected, proving the role check itself works.
        mockMvc
                .perform(get("/cases/{caseId}", OTHERS_CASE_ID).with(policeJwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ownerAddress", is(OTHER_OWNER_ADDRESS)));
    }

    @Test
    void unknownCaseIsNotFoundEvenForAnInstitutionalActor() throws Exception {
        mockMvc.perform(get("/cases/{caseId}", 999_999L).with(policeJwt())).andExpect(status().isNotFound());
    }

    @Test
    void anyoneCanReadContractAddressesWithoutAToken() throws Exception {
        mockMvc
                .perform(get("/contracts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.chainId", is(20260711)))
                .andExpect(jsonPath("$.tokenAddress", is("0xTOKEN")));
    }

    private org.springframework.test.web.servlet.request.RequestPostProcessor citizenJwt() {
        return jwt()
                .jwt(
                        builder ->
                                builder
                                        .claim("role", ApplicationRole.CITIZEN.name())
                                        .claim("evmAddress", CITIZEN_ADDRESS))
                .authorities(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_CITIZEN"));
    }

    private org.springframework.test.web.servlet.request.RequestPostProcessor policeJwt() {
        return jwt()
                .jwt(
                        builder ->
                                builder
                                        .claim("role", ApplicationRole.POLICE.name())
                                        .claim("evmAddress", "0xPOLICE"))
                .authorities(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_POLICE"));
    }
}
