import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Servicio centralizado para todas las operaciones con Supabase
 * Gestiona autenticación, BD, y sincronización de datos
 */
@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private url = 'https://cehhyegczbdoiuztsxpk.supabase.co';
  private anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlaGh5ZWdjemJkb2l1enRzeHBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MDQyMjMsImV4cCI6MjA4OTk4MDIyM30.do5Le7etN0lfUV8jLJ9MRPh5mMZ2Az_K7CpEk0xYYBI';

  constructor() {
    this.supabase = createClient(this.url, this.anonKey);
  }

  /**
   * Registrar nuevo usuario
   */
  async signUp(email: string, password: string, username: string) {
    try {
      // Primero registramos en Auth
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username
          }
        }
      });

      if (authError) {
        throw new Error(`Auth error: ${authError.message}`);
      }

      // Luego creamos el registro en la tabla 'users'
      if (authData.user) {
        const { error: dbError } = await this.supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              usuario: username,
              email: email
            }
          ]);

        if (dbError) {
          throw new Error(`DB error: ${dbError.message}`);
        }
      }

      return { success: true, user: authData.user };
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  /**
   * Iniciar sesión con email y contraseña
   */
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw new Error(`Login error: ${error.message}`);
      }

      // Obtener datos del usuario y sus permisos
      if (data.user) {
        const userData = await this.getUserWithPermissions(data.user.id);
        return {
          success: true,
          user: userData,
          token: data.session?.access_token
        };
      }

      return { success: false, error: 'No user data' };
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  /**
   * Obtener usuario actual con todos sus permisos por grupo
   */
  async getUserWithPermissions(userId: string) {
    try {
      // Obtener datos del usuario
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) {
        throw new Error(`User fetch error: ${userError.message}`);
      }

      // Obtener grupos y permisos
      const { data: permissions, error: permError } = await this.supabase
        .from('permissions')
        .select('group_id, permiso')
        .eq('user_id', userId);

      if (permError) {
        throw new Error(`Permissions fetch error: ${permError.message}`);
      }

      // Agrupar permisos por grupo
      const permissionsByGroup: { [key: string]: string[] } = {};
      if (permissions) {
        permissions.forEach(perm => {
          if (!permissionsByGroup[perm.group_id]) {
            permissionsByGroup[perm.group_id] = [];
          }
          permissionsByGroup[perm.group_id].push(perm.permiso);
        });
      }

      return {
        ...user,
        permissionsByGroup,
        defaultGroupId: Object.keys(permissionsByGroup)[0] || null
      };
    } catch (error) {
      console.error('Get user with permissions error:', error);
      throw error;
    }
  }

  /**
   * Cerrar sesión
   */
  async signOut() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        throw new Error(`Sign out error: ${error.message}`);
      }
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  /**
   * Obtener sesión actual
   */
  async getSession() {
    const { data, error } = await this.supabase.auth.getSession();
    if (error) {
      console.error('Get session error:', error);
      return null;
    }
    return data.session;
  }

  /**
   * Obtener usuario actual autenticado
   */
  async getCurrentUser() {
    const { data, error } = await this.supabase.auth.getUser();
    if (error) {
      console.error('Get current user error:', error);
      return null;
    }
    return data.user;
  }

  /**
   * Obtener todos los tickets de un grupo
   */
  async getTicketsByGroup(groupId: string) {
    try {
      const { data, error } = await this.supabase
        .from('tickets')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Fetch tickets error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Get tickets error:', error);
      throw error;
    }
  }

  /**
   * Crear nuevo ticket
   */
  async createTicket(titulo: string, descripcion: string, groupId: string, prioridad: string = 'medium', userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('tickets')
        .insert([
          {
            titulo,
            descripcion,
            group_id: groupId,
            prioridad,
            estado: 'todo',
            created_by: userId
          }
        ])
        .select();

      if (error) {
        throw new Error(`Create ticket error: ${error.message}`);
      }

      return data?.[0];
    } catch (error) {
      console.error('Create ticket error:', error);
      throw error;
    }
  }

  /**
   * Actualizar estado de un ticket
   */
  async updateTicketStatus(ticketId: string, newStatus: string) {
    try {
      const { data, error } = await this.supabase
        .from('tickets')
        .update({ estado: newStatus, updated_at: new Date() })
        .eq('id', ticketId)
        .select();

      if (error) {
        throw new Error(`Update ticket error: ${error.message}`);
      }

      return data?.[0];
    } catch (error) {
      console.error('Update ticket error:', error);
      throw error;
    }
  }

  /**
   * Obtener todos los grupos del usuario
   */
  async getUserGroups(userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('group_members')
        .select('groups(*)')
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Fetch groups error: ${error.message}`);
      }

      return data?.map((gm: any) => gm.groups) || [];
    } catch (error) {
      console.error('Get user groups error:', error);
      throw error;
    }
  }

  /**
   * Crear nuevo grupo
   */
  async createGroup(nombre: string, descripcion: string, userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('groups')
        .insert([
          {
            nombre,
            descripcion,
            created_by: userId
          }
        ])
        .select();

      if (error) {
        throw new Error(`Create group error: ${error.message}`);
      }

      return data?.[0];
    } catch (error) {
      console.error('Create group error:', error);
      throw error;
    }
  }

  /**
   * Obtener la instancia de Supabase para queries avanzadas
   */
  getClient(): SupabaseClient {
    return this.supabase;
  }
}
