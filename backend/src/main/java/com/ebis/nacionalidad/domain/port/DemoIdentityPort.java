package com.ebis.nacionalidad.domain.port;

import com.ebis.nacionalidad.domain.model.DemoIdentity;
import java.util.Optional;

/** Outbound port for looking up the fixed demo identities used to log in. */
public interface DemoIdentityPort {

    Optional<DemoIdentity> findByUsername(String username);
}
