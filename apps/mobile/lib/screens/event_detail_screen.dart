import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:intl/intl.dart';
import '../models/experience_instance_model.dart';
import '../models/experience_model.dart';
import '../models/venue_model.dart';
import '../services/firestore_service.dart';
import 'venue_profile_screen.dart';

class EventDetailScreen extends StatefulWidget {
  final ExperienceInstanceModel instance;
  final ExperienceModel? experience;
  final VenueModel? venue;

  const EventDetailScreen({
    super.key,
    required this.instance,
    this.experience,
    this.venue,
  });

  @override
  State<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends State<EventDetailScreen> {
  final FirestoreService _firestoreService = FirestoreService();
  final TextEditingController _commentController = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  String _formatDateRange() {
    final start = widget.instance.startAt.toDate();
    final end = widget.instance.endAt.toDate();
    final dateFmt = DateFormat('EEE, MMM d');
    final timeFmt = DateFormat('h:mm a');
    if (DateFormat('yyyy-MM-dd').format(start) == DateFormat('yyyy-MM-dd').format(end)) {
      return '${dateFmt.format(start)} · ${timeFmt.format(start)} - ${timeFmt.format(end)}';
    }
    return '${dateFmt.format(start)} ${timeFmt.format(start)} - ${dateFmt.format(end)} ${timeFmt.format(end)}';
  }

  Future<void> _submitComment() async {
    final text = _commentController.text.trim();
    if (text.isEmpty || _submitting) return;
    setState(() => _submitting = true);
    try {
      await _firestoreService.addEventComment(widget.instance.instanceId, text);
      _commentController.clear();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not post comment: $e')),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final exp = widget.experience;
    final venue = widget.venue;
    final userId = FirebaseAuth.instance.currentUser?.uid;

    return Scaffold(
      appBar: AppBar(title: const Text('Event details')),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Theme.of(context).dividerColor),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.instance.title,
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _formatDateRange(),
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      if (venue != null) ...[
                        const SizedBox(height: 6),
                        Text(
                          '${venue.name} · ${venue.address}',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          OutlinedButton.icon(
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => VenueProfileScreen(
                                    venue: venue!,
                                    initialTabIndex: 2,
                                  ),
                                ),
                              );
                            },
                            icon: const Icon(Icons.storefront_outlined, size: 18),
                            label: const Text('View venue'),
                          ),
                          OutlinedButton.icon(
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => VenueProfileScreen(
                                    venue: venue!,
                                    initialTabIndex: 3,
                                  ),
                                ),
                              );
                            },
                            icon: const Icon(Icons.local_offer_outlined, size: 18),
                            label: const Text('Venue specials'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                if (exp != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Theme.of(context).dividerColor),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (exp.description.trim().isNotEmpty)
                          Text(
                            exp.description,
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        const SizedBox(height: 10),
                        Text(
                          exp.cost != null ? 'Price: €${exp.costDisplay ?? exp.cost}' : 'Price: Free',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: [
                            if ((exp.genre ?? '').trim().isNotEmpty) _EventDetailPill(label: exp.genre!.trim()),
                            if (exp.bookingRequired) const _EventDetailPill(label: 'Booking required'),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 20),
                Text(
                  'Comments',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 8),
                StreamBuilder<List<Map<String, dynamic>>>(
                  stream: _firestoreService.getEventCommentsStream(widget.instance.instanceId),
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Padding(
                        padding: EdgeInsets.all(16),
                        child: Center(child: CircularProgressIndicator()),
                      );
                    }
                    if (snapshot.hasError) {
                      return const Padding(
                        padding: EdgeInsets.all(8),
                        child: Text('Could not load comments'),
                      );
                    }
                    final comments = snapshot.data ?? [];
                    if (comments.isEmpty) {
                      return const Padding(
                        padding: EdgeInsets.symmetric(vertical: 8),
                        child: Text('No comments yet. Be the first to comment.'),
                      );
                    }
                    return Column(
                      children: comments.map((comment) {
                        final author = (comment['author'] as Map<String, dynamic>?) ?? {};
                        final createdAt = comment['createdAt'] as Timestamp?;
                        final authorId = author['userId'] as String?;
                        final canDelete = userId != null && authorId == userId;
                        return ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 0, vertical: 2),
                          title: Text(author['displayName'] as String? ?? 'User'),
                          subtitle: Text(comment['text'] as String? ?? ''),
                          trailing: canDelete
                              ? IconButton(
                                  icon: const Icon(Icons.delete_outline),
                                  onPressed: () async {
                                    try {
                                      await _firestoreService.deleteEventComment(
                                        widget.instance.instanceId,
                                        comment['id'] as String,
                                      );
                                    } catch (e) {
                                      if (!mounted) return;
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(content: Text('Could not delete comment: $e')),
                                      );
                                    }
                                  },
                                )
                              : null,
                          dense: false,
                          isThreeLine: createdAt != null,
                          subtitleTextStyle: Theme.of(context).textTheme.bodyMedium,
                        );
                      }).toList(),
                    );
                  },
                ),
              ],
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _commentController,
                      minLines: 1,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        hintText: 'Add a comment',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    onPressed: _submitting ? null : _submitComment,
                    child: _submitting
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Post'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EventDetailPill extends StatelessWidget {
  final String label;
  const _EventDetailPill({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: Theme.of(context).textTheme.bodySmall?.color,
        ),
      ),
    );
  }
}
