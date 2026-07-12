package com.ebis.nacionalidad.infrastructure.web;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ebis.nacionalidad.domain.model.ApplicationRole;
import com.ebis.nacionalidad.domain.model.CaseStatus;
import com.ebis.nacionalidad.domain.model.OnChainRole;
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
        when(nationalityLedgerClient.hasRole(any(), eq("0xPOLICE"))).thenReturn(false);
        when(nationalityLedgerClient.hasRole(OnChainRole.POLICE, "0xPOLICE")).thenReturn(true);
    }

    private OnChainCase onChainCase(long caseId, String owner) {
        return new OnChainCase(
                caseId, owner, CaseStatus.IN_REVIEW, 0, "0x00", false, false, false, BigInteger.ZERO);
    }

    @Test
    void walletNonceIsPublic() throws Exception {
        mockMvc
                .perform(
                        post("/auth/nonce")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"address\":\"%s\",\"chainId\":20260711}".formatted(CITIZEN_ADDRESS)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.address", is(CITIZEN_ADDRESS.toLowerCase())))
                .andExpect(jsonPath("$.chainId", is(20260711)));
    }

    @Test
    void walletNonceRejectsUnsupportedChain() throws Exception {
        mockMvc
                .perform(
                        post("/auth/nonce")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"address\":\"%s\",\"chainId\":1}".formatted(CITIZEN_ADDRESS)))
                .andExpect(status().isUnauthorized());
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
        mockMvc
                .perform(get("/cases/{caseId}", OTHERS_CASE_ID).with(citizenJwt()))
                .andExpect(status().isForbidden());
    }

    @Test
    void institutionalRoleCanViewAnyCase() throws Exception {
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
                                        .subject(CITIZEN_ADDRESS.toLowerCase())
                                        .claim("evmAddress", CITIZEN_ADDRESS)
                                        .claim("chainId", 20260711L));
    }

    private org.springframework.test.web.servlet.request.RequestPostProcessor policeJwt() {
        return jwt()
                .jwt(
                        builder ->
                                builder
                                        .subject("0xpolice")
                                        .claim("evmAddress", "0xPOLICE")
                                        .claim("chainId", 20260711L));
    }
}
