export interface AuthProfile {
  email: string | null
  fullName: string | null
  id: string
}

export interface AuthOrganization {
  domain: string | null
  id: string | null
  isEmployee: boolean | null
  role: string | null
}

export interface AuthContext {
  organization: AuthOrganization
  profile: AuthProfile
}
