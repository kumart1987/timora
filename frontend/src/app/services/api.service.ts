import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:5000/api';
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    const savedUser = localStorage.getItem('timora_user');
    if (savedUser) {
      try {
        this.currentUserSubject.next(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('timora_user');
      }
    }
  }

  // --- Auth ---
  login(credentials: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/login`, credentials).pipe(
      tap((res: any) => {
        if (res && res.token) {
          localStorage.setItem('timora_token', res.token);
          localStorage.setItem('timora_user', JSON.stringify(res.user));
          this.currentUserSubject.next(res.user);
        }
      })
    );
  }

  signup(userData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/signup`, userData).pipe(
      tap((res: any) => {
        if (res && res.token) {
          localStorage.setItem('timora_token', res.token);
          localStorage.setItem('timora_user', JSON.stringify(res.user));
          this.currentUserSubject.next(res.user);
        }
      })
    );
  }

  logout() {
    localStorage.removeItem('timora_token');
    localStorage.removeItem('timora_user');
    this.currentUserSubject.next(null);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('timora_token');
  }

  // --- Dashboard ---
  getStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/dashboard/stats`);
  }

  // --- Tracker (Income & Expenses) ---
  getIncome(): Observable<any> {
    return this.http.get(`${this.baseUrl}/tracker/income`);
  }
  addIncome(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/tracker/income`, data);
  }
  updateIncome(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/tracker/income/${id}`, data);
  }
  deleteIncome(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/tracker/income/${id}`);
  }

  getExpenses(): Observable<any> {
    return this.http.get(`${this.baseUrl}/tracker/expenses`);
  }
  addExpense(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/tracker/expenses`, data);
  }
  updateExpense(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/tracker/expenses/${id}`, data);
  }
  deleteExpense(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/tracker/expenses/${id}`);
  }

  // --- Shopping ---
  getShopping(): Observable<any> {
    return this.http.get(`${this.baseUrl}/shopping`);
  }
  addShopping(formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/shopping`, formData);
  }
  deleteShopping(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/shopping/${id}`);
  }

  // --- Investments ---
  getInvestments(): Observable<any> {
    return this.http.get(`${this.baseUrl}/investments`);
  }
  addInvestment(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/investments`, data);
  }
  updateInvestmentPrice(id: number, currentPrice: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/investments/${id}/price`, { current_price: currentPrice });
  }
  deleteInvestment(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/investments/${id}`);
  }

  // --- Health/Weight ---
  getWeightLogs(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health/weight`);
  }
  addWeightLog(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/health/weight`, data);
  }
  deleteWeightLog(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/health/weight/${id}`);
  }

  // --- Trips ---
  getTrips(): Observable<any> {
    return this.http.get(`${this.baseUrl}/trips`);
  }
  addTrip(formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/trips`, formData);
  }
  updateTrip(id: number, formData: FormData): Observable<any> {
    return this.http.put(`${this.baseUrl}/trips/${id}`, formData);
  }
  deleteTrip(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/trips/${id}`);
  }
}
