import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../services/firestore_service.dart';
import '../models/user_model.dart';

class ProfileSetupScreen extends StatefulWidget {
  const ProfileSetupScreen({super.key});

  @override
  State<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends State<ProfileSetupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _aboutController = TextEditingController();
  final FirestoreService _firestoreService = FirestoreService();
  bool _isLoading = false;
  bool _isCheckingHandle = false;
  bool _isHandleAvailable = false;
  String? _errorMessage;
  String? _handleError;

  @override
  void initState() {
    super.initState();
    // Debounce handle checking
    _usernameController.addListener(_checkHandleAvailability);
  }

  @override
  void dispose() {
    _usernameController.removeListener(_checkHandleAvailability);
    _usernameController.dispose();
    _aboutController.dispose();
    super.dispose();
  }

  Future<void> _checkHandleAvailability() async {
    final handle = _usernameController.text.trim();
    
    // Reset state if handle is empty
    if (handle.isEmpty) {
      setState(() {
        _isHandleAvailable = false;
        _handleError = null;
        _isCheckingHandle = false;
      });
      return;
    }

    // Validate format first
    if (!RegExp(r'^[a-zA-Z0-9_]+$').hasMatch(handle)) {
      setState(() {
        _isHandleAvailable = false;
        _handleError = 'Handle can only contain letters, numbers, and underscores';
        _isCheckingHandle = false;
      });
      return;
    }

    if (handle.length < 3) {
      setState(() {
        _isHandleAvailable = false;
        _handleError = 'Handle must be at least 3 characters';
        _isCheckingHandle = false;
      });
      return;
    }

    // Debounce: wait a bit before checking
    await Future.delayed(const Duration(milliseconds: 500));
    
    // Only check if the handle hasn't changed
    if (_usernameController.text.trim() != handle) {
      return;
    }

    setState(() {
      _isCheckingHandle = true;
      _handleError = null;
    });

    try {
      final isAvailable = await _firestoreService.isHandleAvailable(handle);
      if (mounted && _usernameController.text.trim() == handle) {
        setState(() {
          _isHandleAvailable = isAvailable;
          _isCheckingHandle = false;
          if (!isAvailable) {
            _handleError = 'This handle is already taken';
          }
        });
      }
    } catch (e) {
      if (mounted && _usernameController.text.trim() == handle) {
        setState(() {
          _isCheckingHandle = false;
          _handleError = 'Error checking handle availability';
        });
      }
    }
  }

  Future<void> _createProfile() async {
    if (!_formKey.currentState!.validate()) return;

    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final handle = _usernameController.text.trim();
      
      // Final check if handle is available
      if (!_isHandleAvailable) {
        setState(() {
          _errorMessage = 'Please choose an available handle';
          _isLoading = false;
        });
        return;
      }

      final isAvailable = await _firestoreService.isHandleAvailable(handle);
      if (!isAvailable) {
        setState(() {
          _errorMessage = 'This handle is already taken. Please choose another.';
          _isLoading = false;
        });
        return;
      }

      final userModel = UserModel(
        uid: user.uid,
        username: handle.toLowerCase(), // Store handle in lowercase for consistency
        about: _aboutController.text.trim().isEmpty
            ? null
            : _aboutController.text.trim(),
      );

      await _firestoreService.createUser(userModel);

      // Navigate to main app
      if (mounted) {
        Navigator.of(context).pushReplacementNamed('/home');
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceAll('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Complete Your Profile'),
        automaticallyImplyLeading: false,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 24),
                const Icon(
                  Icons.person_add,
                  size: 80,
                  color: Colors.blue,
                ),
                const SizedBox(height: 16),
                Text(
                  'Welcome to LOKI!',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Let\'s set up your profile to get started',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.grey[600],
                      ),
                ),
                const SizedBox(height: 32),

                // Error Message
                if (_errorMessage != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: Colors.red[50],
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.red[300]!),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.error_outline, color: Colors.red[700]),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _errorMessage!,
                            style: TextStyle(color: Colors.red[700]),
                          ),
                        ),
                      ],
                    ),
                  ),

                // Handle Field
                TextFormField(
                  controller: _usernameController,
                  decoration: InputDecoration(
                    labelText: 'Handle *',
                    hintText: 'Choose a unique handle',
                    prefixIcon: const Icon(Icons.alternate_email),
                    suffixIcon: _usernameController.text.isNotEmpty
                        ? _isCheckingHandle
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: Padding(
                                  padding: EdgeInsets.all(12),
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                ),
                              )
                            : _isHandleAvailable
                                ? const Icon(Icons.check_circle, color: Colors.green)
                                : _handleError != null
                                    ? const Icon(Icons.error, color: Colors.red)
                                    : null
                        : null,
                    border: const OutlineInputBorder(),
                    errorText: _handleError,
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter a handle';
                    }
                    if (value.length < 3) {
                      return 'Handle must be at least 3 characters';
                    }
                    if (!RegExp(r'^[a-zA-Z0-9_]+$').hasMatch(value)) {
                      return 'Handle can only contain letters, numbers, and underscores';
                    }
                    if (!_isHandleAvailable && _usernameController.text.trim().isNotEmpty) {
                      return 'This handle is already taken';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // About Field
                TextFormField(
                  controller: _aboutController,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    labelText: 'About (Optional)',
                    hintText: 'Tell us a bit about yourself...',
                    prefixIcon: Icon(Icons.info_outline),
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 32),

                // Create Profile Button
                ElevatedButton(
                  onPressed: _isLoading ? null : _createProfile,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Create Profile'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

