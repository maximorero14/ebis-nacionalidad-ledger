package com.ebis.nacionalidad.application;

import com.ebis.nacionalidad.domain.model.ApplicationRole;
import java.util.Arrays;

public class WrongRoleException extends RuntimeException {

    public WrongRoleException(ApplicationRole... allowedRoles) {
        super("This action requires one of the following roles: " + Arrays.toString(allowedRoles));
    }
}
