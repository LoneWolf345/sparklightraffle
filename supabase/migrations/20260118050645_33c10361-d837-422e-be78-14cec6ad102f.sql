-- Create entra_users table for storing Entra ID user information
CREATE TABLE public.entra_users (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL,
    last_login_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    -- Link to Supabase auth user
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    UNIQUE (tenant_id, subject_id)
);

-- Create audit_log table for tracking actions
CREATE TABLE public.audit_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    user_id UUID REFERENCES public.entra_users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details_json JSONB
);

-- Create index for common queries
CREATE INDEX idx_audit_log_timestamp ON public.audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_action_type ON public.audit_log(action_type);
CREATE INDEX idx_entra_users_email ON public.entra_users(email);
CREATE INDEX idx_entra_users_auth_user_id ON public.entra_users(auth_user_id);

-- Enable RLS
ALTER TABLE public.entra_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for entra_users
CREATE POLICY "Users can view their own entra record"
ON public.entra_users
FOR SELECT
USING (auth.uid() = auth_user_id);

CREATE POLICY "Admins can view all entra users"
ON public.entra_users
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage entra users"
ON public.entra_users
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for audit_log
CREATE POLICY "Admins can view audit logs"
ON public.audit_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert audit logs"
ON public.audit_log
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- System can insert audit logs (for edge functions with service role)
CREATE POLICY "Service role can manage audit logs"
ON public.audit_log
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Create function to log actions (callable from edge functions)
CREATE OR REPLACE FUNCTION public.log_action(
    p_user_id UUID,
    p_action_type TEXT,
    p_entity_type TEXT,
    p_entity_id TEXT DEFAULT NULL,
    p_details_json JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO public.audit_log (user_id, action_type, entity_type, entity_id, details_json)
    VALUES (p_user_id, p_action_type, p_entity_type, p_entity_id, p_details_json)
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$;