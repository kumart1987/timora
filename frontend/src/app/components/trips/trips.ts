import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-trips',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatTableModule
  ],
  templateUrl: './trips.html',
  styleUrl: './trips.scss'
})
export class Trips implements OnInit {
  tripsList: any[] = [];
  displayedColumns = ['dates', 'location', 'notes', 'documents', 'actions'];

  // Form State
  tripForm!: FormGroup;
  isFormOpen = false;
  formMode: 'add' | 'edit' = 'add';
  editingId: number | null = null;
  selectedFiles: File[] = [];
  existingDocuments: any[] = [];
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.initForm();
    this.loadTrips();
  }

  initForm() {
    const today = new Date().toISOString().split('T')[0];
    this.tripForm = this.fb.group({
      location: ['', Validators.required],
      start_date: [today, Validators.required],
      end_date: [today, Validators.required],
      notes: ['']
    });
    this.selectedFiles = [];
    this.existingDocuments = [];
  }

  loadTrips() {
    this.api.getTrips().subscribe({
      next: (data) => {
        this.tripsList = data;
      },
      error: (err) => console.error('Error loading trips:', err)
    });
  }

  onFilesSelected(event: any) {
    const files = event.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        this.selectedFiles.push(files[i]);
      }
    }
  }

  removeSelectedFile(index: number) {
    this.selectedFiles.splice(index, 1);
  }

  removeExistingDocument(index: number) {
    this.existingDocuments.splice(index, 1);
  }

  openAddForm() {
    this.initForm();
    this.formMode = 'add';
    this.editingId = null;
    this.isFormOpen = true;
  }

  openEditForm(trip: any) {
    this.formMode = 'edit';
    this.editingId = trip.id;
    this.isFormOpen = true;

    const start = new Date(trip.start_date).toISOString().split('T')[0];
    const end = new Date(trip.end_date).toISOString().split('T')[0];

    this.tripForm.patchValue({
      location: trip.location,
      start_date: start,
      end_date: end,
      notes: trip.notes || ''
    });

    this.selectedFiles = [];
    // Load existing documents from JSONB structure
    this.existingDocuments = trip.documents || [];
  }

  closeForm() {
    this.isFormOpen = false;
    this.tripForm.reset();
  }

  onSubmit() {
    if (this.tripForm.invalid) return;

    this.isSubmitting = true;
    const formVal = this.tripForm.value;

    const formData = new FormData();
    formData.append('location', formVal.location);
    formData.append('start_date', formVal.start_date);
    formData.append('end_date', formVal.end_date);
    formData.append('notes', formVal.notes);

    // If editing, append existing documents list
    if (this.formMode === 'edit') {
      formData.append('existing_documents', JSON.stringify(this.existingDocuments));
    }

    // Append newly selected files
    this.selectedFiles.forEach((file) => {
      formData.append('documents', file);
    });

    const apiCall = this.formMode === 'add'
      ? this.api.addTrip(formData)
      : this.api.updateTrip(this.editingId!, formData);

    apiCall.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.snackBar.open(`Trip ${this.formMode === 'add' ? 'saved' : 'updated'} successfully`, 'Dismiss', { duration: 3000 });
        this.closeForm();
        this.loadTrips();
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err.error?.message || 'Error occurred while saving trip';
        this.snackBar.open(msg, 'Dismiss', { duration: 5000 });
      }
    });
  }

  deleteTrip(id: number) {
    if (confirm('Are you sure you want to cancel this trip record?')) {
      this.api.deleteTrip(id).subscribe({
        next: () => {
          this.snackBar.open('Trip cancelled', 'Dismiss', { duration: 3000 });
          this.loadTrips();
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open('Error cancelling trip', 'Dismiss', { duration: 5000 });
        }
      });
    }
  }

  getDaysCount(startDate: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const diffTime = start.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  getTripDocUrl(doc: any): string {
    const filename = doc.file_path.split('/').pop();
    return `http://localhost:5000/uploads/${filename}`;
  }
}
